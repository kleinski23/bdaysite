// Slumbook moderation and backups for the Vercel Blob store.
// Needs BLOB_READ_WRITE_TOKEN (run `npx vercel env pull .env.local` once). Each hide/unhide/delete is one Blob write.
//   npm run wishes -- list            show every page with its id (hidden ones marked)
//   npm run wishes -- hide <id>       remove a page from the site (restorable)
//   npm run wishes -- unhide <id>     put a hidden page back
//   npm run wishes -- delete <id>     remove a page permanently
//   npm run wishes -- backup          save everything to backups/wishes-YYYY-MM-DD.json
import { mkdir, writeFile } from 'node:fs/promises';
import { createBlobStore } from '../server/wishes.mjs';

const { BLOB_READ_WRITE_TOKEN: token, BLOB_ACCESS: access = 'private' } = process.env;
if (!token) { console.error('Set BLOB_READ_WRITE_TOKEN first: run `npx vercel env pull .env.local`.'); process.exit(1); }
const store = createBlobStore({ token, access });
const [command, id] = process.argv.slice(2);
const find = wishes => { const wish = wishes.find(w => w.id === id || w.id.startsWith(id || '\0')); if (!wish) { console.error('No page with id ' + id); process.exit(1); } return wish; };

if (command === 'list') {
  for (const wish of await store.all()) console.log(`${wish.id.slice(0, 8)}  ${wish.createdAt.slice(0, 16).replace('T', ' ')}  ${wish.hidden ? '[hidden] ' : ''}${wish.name}: ${wish.message.replace(/\s+/g, ' ').slice(0, 60)}`);
} else if (command === 'hide' || command === 'unhide') {
  let target;
  await store.update(wishes => { target = find(wishes); return wishes.map(w => w === target ? { ...w, hidden: command === 'hide' } : w); });
  console.log(`${command === 'hide' ? 'Hid' : 'Restored'} the page from ${target.name}. The site updates within about a minute.`);
} else if (command === 'delete') {
  let target;
  await store.update(wishes => { target = find(wishes); return wishes.filter(w => w !== target); });
  console.log(`Deleted the page from ${target.name}.`);
} else if (command === 'backup') {
  const wishes = await store.all();
  await mkdir(new URL('../backups/', import.meta.url), { recursive: true });
  const file = new URL(`../backups/wishes-${new Date().toISOString().slice(0, 10)}.json`, import.meta.url);
  await writeFile(file, JSON.stringify(wishes, null, 2) + '\n', 'utf8');
  console.log(`Saved ${wishes.length} pages (${wishes.filter(w => w.hidden).length} hidden) to ${file.pathname}`);
} else {
  console.log('Usage: npm run wishes -- list | hide <id> | unhide <id> | delete <id> | backup');
}
