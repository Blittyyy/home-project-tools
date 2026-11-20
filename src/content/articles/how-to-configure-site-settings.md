---
title: How to configure site settings
description: Sample how-to that points editors to the central configuration files in this starter repository.
summary: Change site identity, navigation, and categories in src/config so a new niche does not require hunting through dozens of files.
slug: how-to-configure-site-settings
category: how-to
subcategory: setup
publishedDate: 2026-08-02
author: Site Starter Editorial Team
tags:
  - demo
  - configuration
featuredImage: /images/articles/demo-configure-settings.svg
featuredImageAlt: Simple geometric illustration representing configuration controls
draft: false
noindex: false
featured: true
reviewLevel: none
relatedArticles:
  - getting-started-with-this-seo-site-starter
  - sample-content-checklist
sources:
  - title: Site Factory architecture notes
    note: See docs/site-factory/architecture.md
faq:
  - question: Where do I change the domain?
    answer: Update SITE_URL in src/config/site.ts. Astro config imports the same value for canonicals and sitemap.
---

> **DEMO CONTENT** — Sample instructional article for the starter. Replace with niche how-tos backed by primary sources.

## Central configuration map

| File | Purpose |
|------|---------|
| `src/config/site.ts` | Name, domain, tagline, author, contact email field, OG image |
| `src/config/categories.ts` | Category slugs, labels, hub descriptions |
| `src/config/navigation.ts` | Header and footer links |
| `src/config/review.ts` | Review/risk taxonomy and callout copy |
| `src/data/tools.ts` | Calculator registry |

## Steps

1. Set `SITE_URL` to your production HTTPS origin (no trailing slash).
2. Replace `CONTACT_EMAIL` with a monitored address only when ready.
3. Redefine `ARTICLE_CATEGORIES` and hub copy for the niche.
4. Update primary navigation labels to match the new hubs.

## Validation

After edits, run `npm run check`, `npm run build`, and `npm run validate`.
