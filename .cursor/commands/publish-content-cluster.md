# Publish Content Cluster

Publish an audited draft cluster after explicit approval.

## Inputs

`$ARGUMENTS` — draft filenames under `src/content/articles/`.

**Default cluster size: 5 drafts.**

- If the user specifies a different count, use that count.
- If the count does not match the expected cluster size, **STOP**.

## Mandatory approval gate

Do **not** flip `draft` / `noindex` until the user has explicitly approved publishing this cluster in the current conversation.

If approval is missing, STOP and ask.

## Preflight (all-or-nothing)

For each file, verify:

- Frontmatter matches live `src/content.config.ts`
- Categories / `reviewLevel` values exist in current config
- Primary sources are real and scoped to the niche
- No unfinished markers (`placeholder`, `research needed`, `todo:`, `tbd`)
- `relatedArticles` slugs resolve to articles that will be indexable after publish
- No invented ratings, offers, reviews, or credentials

If **any** article is not publication-ready, publish **none** of them.

## Publish steps

1. Set `draft: false` and `noindex: false` on the approved cluster.
2. Add natural reciprocal/contextual links only where useful — never force reciprocal links.
3. Add unique featured images when the niche needs them (WebP preferred; common starter convention is 1200×800) under `public/images/articles/` with alt text.
4. Default hubs auto-list indexable articles — only edit hub pages if your niche uses hand-maintained sections.
5. Do **not** invent research at publish time.
6. Do **not** commit, push, deploy, or submit URLs to Search Console inside this command.

## Validation

```bash
npm run check
npm run build
npm run validate
```

Confirm each new URL appears in:

- its category hub
- `search-index.json`
- sitemap

Confirm drafts/noindex pages remain excluded.

## Output

Publication report: URLs, image paths, reciprocal links added, validation results, and anything still needing human review.
