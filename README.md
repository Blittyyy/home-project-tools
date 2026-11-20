# SEO Site Starter

Reusable Astro starter for niche SEO content websites. This repository is intended as a **GitHub Template Repository** / cloneable starter — not a finished niche site.

Architecture and editorial processes follow `docs/site-factory/`. Demo branding and sample articles are intentionally neutral.

## Recommended workflow

1. **Clone the starter**
2. **Install dependencies** (`npm install`)
3. **Configure site** (`src/config/site.ts`)
4. **Replace categories** (`src/config/categories.ts`)
5. **Define review/safety policy** (`src/config/review.ts`, `docs/editorial-guidelines.md`)
6. **Review navigation** (`src/config/navigation.ts` — category links auto-derive from categories)
7. **Remove demo content** (articles + demo images)
8. **Replace demo calculator if desired** (`src/data/tools.ts` + calculator files)
9. **Review legal placeholders** (about/contact/privacy/terms/disclaimer)
10. **Run validate** (`npm run build` then `npm run validate`)
11. **Create first content cluster** (Cursor create → approve → publish)
12. **Build** (`npm run build`)
13. **Deploy** (Vercel / static host)
14. **Connect Search Console**
15. **Submit sitemap** (`/sitemap-index.xml`)

### Quick start

```bash
git clone https://github.com/Blittyyy/seo-site-starter.git
cd seo-site-starter
npm install
npm run dev
```

## Do not forget

- **Domain** — set `SITE_URL` in `src/config/site.ts` to your production HTTPS origin (no trailing slash). Astro `site`, canonicals, robots sitemap, and OG URLs derive from it.
- **Contact email** — replace `CONTACT_EMAIL` before launch; do not invent an unmonitored inbox.
- **Legal review** — legal pages are shells marked for review; do not invent entity, address, or jurisdiction.
- **Social image** — replace `public/og-default.svg` (and `DEFAULT_OG_IMAGE_PATH` if the filename changes).
- **Analytics** — Vercel Analytics is wired in `BaseLayout`; document final analytics behavior in Privacy before launch.
- **Demo content removal** — delete the three sample articles and `public/images/articles/demo-*.svg` before treating the site as real SEO content.

## Configure the site

Primary configuration layer:

| File | Purpose |
|------|---------|
| `src/config/site.ts` | Name, domain, tagline, author, contact, OG image, footer blurb, search suggestions |
| `src/config/categories.ts` | Category slugs, labels, hub copy |
| `src/config/navigation.ts` | Non-category nav items (category links derive automatically) |
| `src/config/review.ts` | Review/risk taxonomy + callout copy |
| `src/config/indexing.ts` | Shared noindex path set used by sitemap filtering |
| `src/data/tools.ts` | Calculator registry + calculators hub copy |

Also usually edited for a new niche:

- `docs/site-factory/new-site-setup-template.md`
- `docs/editorial-guidelines.md`
- `public/favicon.svg`, `public/og-default.svg`
- `src/pages/index.astro` homepage framing copy
- `src/styles/global.css` design tokens

## Replace categories

1. Edit `ARTICLE_CATEGORIES` and `CATEGORIES` in `src/config/categories.ts`.
2. Update/remove demo articles so frontmatter categories match the new enum.
3. Review `src/config/navigation.ts` only if you need different non-category links (Calculators/About/etc.).
4. Run `npm run check && npm run build && npm run validate`.

Routing is generic (`/[category]` and `/[category]/[slug]`) and does **not** hardcode demo slugs.

## Remove demo content safely

1. Delete:
   - `src/content/articles/getting-started-with-this-seo-site-starter.md`
   - `src/content/articles/how-to-configure-site-settings.md`
   - `src/content/articles/sample-content-checklist.md`
   - `public/images/articles/demo-*.svg`
2. Optionally rewrite homepage “Sample articles” framing in `src/pages/index.astro`.
3. Run `npm run check && npm run build && npm run validate`.

Hubs, search, sitemap, and related-article resolution are derived from indexable content, so empty hubs/search remain valid.

## Replace / remove the demo calculator

To remove the Rectangle Area Calculator:

1. Delete:
   - `src/utils/rectangle-area.ts`
   - `src/components/RectangleAreaCalculator.astro`
   - `src/pages/calculators/rectangle-area.astro`
   - `scripts/test-rectangle-area.mjs`
2. Remove the tool entry from `src/data/tools.ts`.
3. Update `package.json` scripts (`test:tools` / `test`) if no calculator tests remain.
4. Coming-soon cards do **not** link to tool routes (`ToolCard` only links `available` tools).
5. If no available tools remain, the calculators hub self-marks `noindex`.

## Review / safety policy

Edit `src/config/review.ts` and `docs/editorial-guidelines.md`.

Default levels: `none` | `general` | `caution` | `professional`.

## Legal placeholders

Pages: `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`.

Do **not** invent legal entity, physical address, jurisdiction, unmonitored email, or affiliate status.

## Content workflow

1. `.cursor/commands/create-content-cluster.md` — drafts with hard stops (default 5; configurable)
2. Explicit human approval
3. `.cursor/commands/publish-content-cluster.md` — publish only after approval

Lighter drafting: `.cursor/commands/write-article-batch.md`.

## Validate

```bash
npm run check
npm run build
npm run test
npm run validate
```

`npm run validate` runs content, link, and SEO gates. Links/SEO require a fresh `dist/` from `npm run build`.

## Deploy to Vercel

1. Push/import the repo in Vercel (Astro preset).
2. Confirm production domain matches `SITE_URL`.
3. Deploy.

No `vercel.json` is required for default static output.

## Search Console + sitemap

1. Verify the production property.
2. Submit `https://YOUR_DOMAIN/sitemap-index.xml`.
3. `/robots.txt` is generated from `SITE_URL`.

---

## Infrastructure files (usually leave alone)

- `src/utils/indexing.ts`, `seo.ts`, `schema.ts`, `search.ts`, `search-rank.ts`, `articles.ts`
- `src/layouts/*`, `src/components/SeoHead.astro`, search/calculator primitives
- `src/pages/[category]/*`, `search-index.json.ts`, `robots.txt.ts`
- `scripts/validate-*.mjs`, `astro.config.mjs` sitemap filter wiring
- `docs/site-factory/*`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local dev server |
| `npm run check` | Astro/content type check |
| `npm run build` | Static production build |
| `npm run test` / `test:tools` | Calculator unit tests |
| `npm run validate:content` | Slugs/titles/descriptions/categories/relatedArticles/images |
| `npm run validate:links` | Built internal hrefs + draft leakage |
| `npm run validate:seo` | Canonicals, robots, sitemap/search consistency |
| `npm run validate` | All validation gates |

## License / intent

Starter skeleton for building new niche sites. Sample content is not real SEO copy.
