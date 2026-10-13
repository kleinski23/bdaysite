# Julia Elisha — Her First Fairytale

A Vite birthday invitation with a Sunshine opening, a gradual dusk transition, an interactive Starlight story, a seven-photo memory book, an arched celebration invitation, and a shared guest wish board.

## Local development

Run `npm install`, then `npm run dev`. Vite serves the website and `/api/wishes` at the same local address. The default URL is http://127.0.0.1:5173/.

## Wish storage (Vercel Blob)

Guest wishes are stored as one JSON file (`slumbook/wishes.json`) in a Vercel Blob store. Nothing outside GitHub and Vercel is needed, and the browser only ever calls `/api/wishes`.

1. In Vercel, open the project → **Storage** → **Create** → **Blob**. Choose **Private** access and connect the store to the project for all environments. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
2. Redeploy. Open the live site, write one test wish, then remove it with `npm run wishes -- delete <id>`.

On Vercel, `api/wishes.js` handles the API. Locally, `npm run dev`, `npm run preview` and `npm start` use the same logic from `server/wishes.mjs`. Without a token they save to `data/wishes.json`. With `.env.local` from `npx vercel env pull .env.local`, they use the real Blob store, so local test wishes will show on the live site.

The API validates both fields, limits message lengths, caps request size, ignores duplicate retries through the browser's request ID, and limits bursts of submissions. Simultaneous posts are kept apart with ETag-conditional writes, so no wish is lost. No accounts, email addresses or IP addresses are stored. Names and messages are rendered as text, never HTML.

**Hobby plan limits:** the free plan includes 2,000 Blob write/list operations and 10,000 reads per month. Going over pauses the store for 30 days. The site is built to stay well under these limits:
- Each wish is one write, and page loads never list the store.
- Vercel's CDN shares the page list between visitors for 15 seconds, and the board refreshes every 30 seconds.
- Browsing the store in the Vercel dashboard also counts as operations, so prefer the script below.

### Moderation and backups

Run `npx vercel env pull .env.local` once, then:

- `npm run wishes -- list` shows every page with a short id.
- `npm run wishes -- hide <id>` removes a page from the site, and `unhide <id>` restores it. `delete <id>` removes it permanently.
- `npm run wishes -- backup` saves every page, hidden ones included, to `backups/wishes-YYYY-MM-DD.json`. Take a backup after the party.

## Assets

`public/` holds only what the site serves: optimized WebP files and the social preview image. The PNG/JPG originals and the original DSC photos are kept locally in `assets-src/` (not in git, because they are large). `npm run assets:optimize` regenerates the WebP files when that folder is present. The prompts used to generate the artwork are in `docs/asset-prompts/`.

## Slumbook

Chapter Three is styled as a textured slumbook. Guests write on lined paper, sign their name, and immediately see their saved page. The book shows one note at a time in a fixed-height frame, with animated page turns, swipe gestures, previous/next controls, and keyboard arrows; a full reader keeps longer wishes readable inside its own bounded panel. The Your pages filter remembers submitted page IDs in this browser's local storage; the actual names and messages are stored in the shared Blob store. Paper fields, tape, binding, gingham patterns, and the Chapter Two 3D wordmark are styled in `src/slumbook.css` and `src/slumbook-paging.css`.

## Content and interactions

Event details are in `index.html` and `src/main.js`: October 25, 2026 at 11:30 AM, UTC+08:00, Park Marina. The venue link performs a map search. No event end time is invented.

The hero keeps the approved generated purple-dress portrait. The story offers three generated portraits and a six-star birthday constellation. Meteors render behind the subject and clouds. Original photographs open a gallery with keyboard arrows and swipe support. Guests can personalize and download a local birthday postcard. Optional music is a synthesized music box (plucked-tine voice, rolling bass, room reverb) playing a continuous playlist of public-domain lullabies — Twinkle Twinkle, Brahms’ Lullaby, Are You Sleeping and Happy Birthday — that flows from one song into the next. It starts only after a user gesture; the player lives in the hero’s "Music-box lullabies" popover and is styled in `src/music.css`.

Current chapter refinements are in `src/chapter-redesign.css`; the "A Day in Her Little World" day dial (vector dusk sky, a scroll-driven sun arc and four photo moments) is in `src/little-world.css`; the minimalist footer is in `src/footer.css`; the hero party ticket and live countdown are in `src/hero-upgrade.css` and `src/main.js`; the floating header (scroll states, section indicator, phone menu) is in `src/header.css`; the journey is in `src/story-journey.js` and `src/story-journey.css`. The bulletin board is in `src/wish-board.js`, with its API in `server/wishes.mjs` and `api/wishes.js`.

Fonts have local fallbacks, and motion respects reduced-motion preferences.
