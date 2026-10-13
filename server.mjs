import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createWishHandler } from './server/wishes.mjs';
const root=resolve('dist');const wishes=createWishHandler();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
createServer(async(req,res)=>{
  if(await wishes(req,res))return;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const body=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT)||5173,process.env.HOST||'127.0.0.1',()=>{console.log('Birthday site running with persistent wish storage.');});
