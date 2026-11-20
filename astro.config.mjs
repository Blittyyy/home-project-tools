// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { SITE_URL } from './src/config/site.ts';
import { NOINDEX_PATHS } from './src/config/indexing.ts';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/$/, '') || '/';
        if (NOINDEX_PATHS.has(pathname)) return false;
        if (pathname === '/search-index.json') return false;
        if (pathname === '/robots.txt') return false;
        return true;
      },
    }),
  ],
  vite: {
    // Tailwind Vite plugin; cast avoided because this is plain ESM (.mjs).
    plugins: [tailwindcss()],
  },
});
