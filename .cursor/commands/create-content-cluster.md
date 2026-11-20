# Create Content Cluster

Turn a proposed topic set into researched, audited, **unpublished** drafts for this site.

## Inputs

`$ARGUMENTS` — topic titles for `[NICHE]`.

**Default cluster size: 5 topics.**

- If the user specifies a different count (for example 3 or 6), use that count.
- If `$ARGUMENTS` is empty, ask for topics.
- If the count does not match the expected cluster size, **STOP** and ask for the correct number.

## Before writing anything

1. Re-read the live schema in `src/content.config.ts` (do not trust chat memory).
2. Re-read categories in `src/config/categories.ts` and review levels in `src/config/review.ts`.
3. Re-read niche editorial rules in `docs/editorial-guidelines.md` when present.
4. Inventory every existing file in `src/content/articles/` (published and draft).
5. Use author/defaults from `src/config/site.ts` unless the user overrides them.

## Hard stops (do not silently replace a topic)

**STOP** and report rather than inventing or swapping topics when any proposed topic has:

1. **Search-intent overlap** with an existing published or draft article
2. **Inadequate primary-source support** for the claims the page would need
3. **Too little unique value** (thin page or pure router to another URL)
4. **Mostly routes to another article** instead of answering a distinct intent
5. **Niche-specific safety/review requirements that cannot be met** with the current `reviewLevel` taxonomy and editorial rules

If a topic fails, propose a replacement and wait for **explicit user approval** before drafting the replacement. Never silently substitute.

## Draft requirements

Create Markdown under `src/content/articles/<slug>.md` only.

Required draft flags:

```yaml
draft: true
noindex: true
featured: false
affiliateDisclosure: false
```

- Use only categories and `reviewLevel` values from the live schema/config for this niche.
- Prefer primary / authoritative sources for the niche; never treat forums, affiliate listicles, or competitor SEO pages as factual authorities.
- Include a direct answer near the top (`summary` + early body).
- Do **not** assume a fixed category list, fixed review taxonomy, manufacturer-only sourcing, or fixed image set.
- Do **not** generate featured images during create (images happen at publish if approved).
- Do **not** modify hubs, navigation, published articles, git state, or deploy settings.
- Do **not** commit, push, or publish (`draft: false`).

## Validation before finishing

Run:

```bash
npm run check
npm run build
```

Confirm the new drafts are **absent** from:

- article routes
- category hubs
- `search-index.json`
- sitemap

## Output

Report for each topic: file path, slug, category, subcategory, reviewLevel, sources, overlap notes, and any skipped/stopped topics with reasons.
