import { defineConfig, loadEnv } from 'vite';
import { createWishHandler, createWishStore } from './server/wishes.mjs';
export default defineConfig(({ mode }) => {
  // Server-only Blob token from .env.local (not exposed to the browser); without it wishes use data/wishes.json.
  const wishHandler = createWishHandler(createWishStore({ ...loadEnv(mode, process.cwd(), ''), ...process.env }));
  return {base:'/',plugins:[{
    name:'birthday-wish-board',
    configureServer(server) {server.middlewares.use(wishHandler);},
    configurePreviewServer(server) {server.middlewares.use(wishHandler);},
  }]};
});
