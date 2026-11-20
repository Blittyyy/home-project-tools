// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { SITE_URL } from './src/config/site.ts';
import { shouldOmitFromSitemap } from './src/utils/sitemap-exclusions.ts';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/$/, '') || '/';
        return !shouldOmitFromSitemap(pathname);
      },
    }),
  ],
  vite: {
    // Tailwind Vite plugin; cast avoided because this is plain ESM (.mjs).
    plugins: [tailwindcss()],
  },
});
