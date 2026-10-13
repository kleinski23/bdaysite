// Vercel Function for /api/wishes. Needs a Blob store connected to the project (it provides BLOB_READ_WRITE_TOKEN).
import { createBlobStore, handleWishRequest } from '../server/wishes.mjs';

const { BLOB_READ_WRITE_TOKEN: token, BLOB_ACCESS: access = 'private' } = process.env;
const store = token ? createBlobStore({ token, access }) : null;

async function respond(request) {
  let status, value, extra;
  if (!store) {
    console.error('[wishes] No Blob store is connected (BLOB_READ_WRITE_TOKEN is not set).');
    [status, value] = [503, { error: 'The slumbook isn’t connected yet. Please try again later.' }];
  } else {
    const body = request.method === 'POST' ? await request.text() : '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
    [status, value, extra] = await handleWishRequest(store, { method: request.method, contentType: request.headers.get('content-type'), body, ip });
  }
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra };
  // Let Vercel's CDN share the page list between visitors for a few seconds, so polling guests don't use up Blob reads.
  if (request.method === 'GET' && status === 200) headers['Vercel-CDN-Cache-Control'] = 'max-age=15, stale-while-revalidate=120';
  return new Response(JSON.stringify(value), { status, headers });
}

export const GET = respond;
export const POST = respond;
