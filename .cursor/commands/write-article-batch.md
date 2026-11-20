# Write Article Batch

Draft unpublished articles with a lighter process than the full create-cluster workflow.

## Inputs

`$ARGUMENTS` — working titles for `[NICHE]`.

**Default batch size: 3–5 titles.**

- If empty, ask for titles.
- If the user requests a different count, follow that request when reasonable.
- If the count is unclear, STOP and ask.

## Before writing

1. Re-read `src/content.config.ts`, `src/config/categories.ts`, and `src/config/review.ts`.
2. Scan existing `src/content/articles/` for overlap.
3. Skip any title that fails risk, overlap, or primary-source screening. Do not invent replacements unless the user asks.
4. Do not assume fixed demo categories, a fixed review taxonomy, manufacturer-only sources, or a fixed article count.

## Draft rules

- Write new files under `src/content/articles/` only
- Keep `draft: true`, `noindex: true`, `featured: false`
- Do not wire hubs/nav, generate images, publish, commit, or push
- Use the live author default from `src/config/site.ts` unless told otherwise
- Cite primary / authoritative sources appropriate to the niche

## Validation

```bash
npm run check
npm run build
```

## Output

Report paths, word counts, sources, skipped titles with reasons, and SERP-structure notes (structure only — not factual sourcing).
