# Home Project Tools

Tool-first Astro site for homeowners and DIYers planning home improvement projects. Built from the SEO site starter architecture; configured for material calculators and supporting guides.

## Positioning

Help users estimate:

- material quantities
- project dimensions
- waste allowance
- unit conversions
- bags / boxes / packages to buy
- later: approximate material cost and shopping lists

Planning estimates only — not engineering, code approval, electrical/plumbing design, architectural plans, or contractor bids.

Working site label: **Home Project Tools** (final brand not chosen yet).

## Quick start

```bash
npm install
npm run dev
```

## Configure before launch

| File | Purpose |
|------|---------|
| `src/config/site.ts` | Temporary name, domain placeholder, contact review marker, search chips |
| `src/config/categories.ts` | `projects`, `materials`, `guides` |
| `src/config/navigation.ts` | Category links auto-derive; Calculators / About / legal |
| `src/config/review.ts` | DIY planning review/callout copy |
| `src/data/tools.ts` | Calculator registry + groups |
| `docs/editorial-guidelines.md` | Niche editorial rules |

Do **not** invent business entity, physical address, monitored email, or production domain until provided.

## MVP calculators (coming soon)

Registered as hub cards only — no tool routes yet:

1. Concrete Calculator (`concrete-masonry`)
2. Gravel Calculator (`landscaping`)
3. Mulch Calculator (`landscaping`)
4. Paint Calculator (`paint-walls`)
5. Tile Calculator (`flooring-tile`)

## Validate

```bash
npm run check
npm run build
npm run test
npm run validate
```

Empty article category hubs and the calculators hub (while no tools are `available`) are **noindex** and omitted from the sitemap.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local dev server |
| `npm run check` | Astro/content type check |
| `npm run build` | Static production build |
| `npm run test` | Calculator tests (placeholder until tools ship) |
| `npm run validate` | Content, link, and SEO gates |

Architecture playbooks remain under `docs/site-factory/`.
