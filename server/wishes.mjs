import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_BYTES = 4096, RATE_WINDOW = 60000, RATE_LIMIT = 20;
class WishError extends Error { constructor(status, message) { super(message); this.status = status; } }

// Per-process burst limit. On Vercel each warm instance keeps its own count, which is enough for a family site.
function createRateLimiter() {
  const attempts = new Map();
  return ip => {
    const now = Date.now();
    for(const [address,times] of attempts)if(!times.some(time=>now-time<RATE_WINDOW))attempts.delete(address);
    const recent=(attempts.get(ip)||[]).filter(time=>now-time<RATE_WINDOW);
    if(recent.length>=RATE_LIMIT)throw new WishError(429,'Please wait a moment before adding another wish.');
    recent.push(now);attempts.set(ip,recent);
  };
}

// Local storage: data/wishes.json on a server with a persistent disk (and local development).
export function createFileStore(directory = resolve('data')) {
  const file = resolve(directory, 'wishes.json');
  let queue = Promise.resolve();
  const limit = createRateLimiter();
  async function readWishes() {
    try { const value = JSON.parse(await readFile(file, 'utf8')); if (!Array.isArray(value)) throw new Error('Invalid wish data'); return value; }
    catch(error) { if(error.code === 'ENOENT') return []; throw error; }
  }
  return {
    async list() { await queue; return (await readWishes()).filter(wish => !wish.hidden); },
    async add({ id, name, message }, ip) {
      const task=queue.then(async()=>{
        const saved=await readWishes();const existing=saved.find(w=>w.id===id);if(existing)return existing;
        limit(ip);
        const wish={id,name,message,createdAt:new Date().toISOString()};saved.push(wish);
        await mkdir(dirname(file),{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';
        await writeFile(temporary,JSON.stringify(saved,null,2),'utf8');await rename(temporary,file);return wish;
      });
      queue=task.then(()=>{},()=>{});return task;
    },
  };
}

// Hosted storage: one JSON file in a Vercel Blob store. Hobby plans include only 2,000 put/list operations
// a month, so each wish costs exactly one put, reads never call list(), and concurrent writers are kept
// apart with ETag-conditional writes (ifMatch) plus a retry.
export const BLOB_PATH = 'slumbook/wishes.json';
export function createBlobStore({ token, access = 'private', sdk, cacheMs = 20000 }) {
  let cache = null; // { wishes, etag, at }
  const limit = createRateLimiter();
  const blob = async () => sdk || await import('@vercel/blob');
  async function read() {
    const { get } = await blob();
    const result = await get(BLOB_PATH, { access, token, useCache: false, ...(cache?.etag && { ifNoneMatch: cache.etag }) });
    if (!result) return (cache = { wishes: [], etag: null, at: Date.now() });
    if (result.statusCode === 304) return (cache = { ...cache, at: Date.now() });
    const wishes = JSON.parse(await new Response(result.stream).text());
    if (!Array.isArray(wishes)) throw new Error('Invalid wish data in ' + BLOB_PATH);
    return (cache = { wishes, etag: result.blob.etag, at: Date.now() });
  }
  async function write(wishes, etag) {
    const { put } = await blob();
    const options = { access, token, contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: 60 };
    const result = await put(BLOB_PATH, JSON.stringify(wishes, null, 2), etag ? { ...options, ifMatch: etag } : { ...options, allowOverwrite: false });
    cache = { wishes, etag: result.etag, at: Date.now() };
  }
  const conflict = error => error?.name === 'BlobPreconditionFailedError' || /precondition|already exists/i.test(error?.message || '');
  return {
    async list() {
      const { wishes } = cache && Date.now() - cache.at < cacheMs ? cache : await read();
      return wishes.filter(wish => !wish.hidden);
    },
    async add({ id, name, message }, ip) {
      for (let attempt = 0; ; attempt++) {
        const { wishes, etag } = await read();
        const existing = wishes.find(wish => wish.id === id); if (existing) return existing;
        if (attempt === 0) limit(ip);
        const wish = { id, name, message, createdAt: new Date().toISOString() };
        try { await write([...wishes, wish], etag); return wish; }
        catch (error) { if (!conflict(error) || attempt >= 4) throw error; await new Promise(r => setTimeout(r, 100 + Math.random() * 300)); }
      }
    },
    // Used by scripts/wishes.mjs for moderation and backups (one put per change).
    async all() { return (await read()).wishes; },
    async update(change) {
      for (let attempt = 0; ; attempt++) {
        const { wishes, etag } = await read();
        try { const next = change(wishes); await write(next, etag); return next; }
        catch (error) { if (!conflict(error) || attempt >= 4) throw error; }
      }
    },
  };
}

export function createWishStore(env = process.env, directory) {
  if (env.BLOB_READ_WRITE_TOKEN) return createBlobStore({ token: env.BLOB_READ_WRITE_TOKEN, access: env.BLOB_ACCESS || 'private' });
  return createFileStore(directory);
}

// Shared request logic for the Node middleware and the Vercel function. Returns [status, body, extraHeaders].
export async function handleWishRequest(store, { method, contentType, body, ip }) {
  try {
    if (method === 'GET') return [200, { wishes: await store.list() }];
    if (method !== 'POST') return [405, { error: 'This request is not supported.' }, { Allow: 'GET, POST' }];
    if (!contentType?.startsWith('application/json')) return [415, { error: 'Please send a valid wish.' }];
    if (body.length > MAX_BYTES) return [413, { error: 'That wish is a little too long.' }];
    let value;try{value=JSON.parse(body);}catch{return [400,{error:'Please check your name and message.'}];}
    const name=typeof value?.name==='string'?value.name.trim():'';
    const message=typeof value?.message==='string'?value.message.trim():'';
    const id=typeof value?.requestId==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(value.requestId)?value.requestId:null;
    if(!name||name.length>50||!message||message.length>500||!id)return [400,{error:'Add your name (up to 50 characters) and a message (up to 500 characters).'}];
    return [201, { wish: await store.add({ id, name, message }, ip || 'local') }];
  } catch (error) {
    if (error instanceof WishError) return [error.status, { error: error.message }];
    console.error('[wishes]', error);
    return [500, { error: method === 'GET' ? 'The pages couldn’t load. Try again in a moment.' : 'The board couldn’t save your wish. Please try again.' }];
  }
}

// Connect-style middleware used by the Vite dev/preview servers and server.mjs.
export function createWishHandler(store = createWishStore()) {
  return async function wishes(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    if(url.pathname !== '/api/wishes') {if(next) next();return false;}
    let body='', bytes=0;
    if(req.method==='POST')for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BYTES)break;body+=chunk;}
    const [status,value,extra]=await handleWishRequest(store,{method:req.method,contentType:req.headers['content-type'],body:bytes>MAX_BYTES?' '.repeat(MAX_BYTES+1):body,ip:req.socket.remoteAddress});
    res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(value));
    return true;
  };
}
