/**
 * Build-time sitemap omission helpers.
 * Empty article hubs and an empty calculators hub stay out of the sitemap,
 * matching their noindex page behavior.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLE_CATEGORIES, CATEGORIES } from '../config/categories';
import { NOINDEX_PATHS } from '../config/indexing';
import { hasAvailableTools } from '../data/tools';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const articlesDir = path.join(root, 'src', 'content', 'articles');

const PLACEHOLDER_PATTERN =
  /\[?\s*placeholder\s*\]?|research needed|to be researched|todo:|tbd\b/i;

function parseFrontmatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const value = kv[2].trim().replace(/^["']|["']$/g, '');
    if (value === 'true' || value === 'false') data[kv[1]] = value === 'true';
    else data[kv[1]] = value;
  }
  return data;
}

function isIndexableArticleFile(raw: string, data: Record<string, unknown>): boolean {
  const draft = data.draft === false ? false : true;
  const noindex = data.noindex === true;
  return !draft && !noindex && !PLACEHOLDER_PATTERN.test(raw);
}

/** Category hub hrefs that currently have zero indexable articles. */
export function getEmptyCategoryHubPaths(): string[] {
  const counts = Object.fromEntries(ARTICLE_CATEGORIES.map((slug) => [slug, 0])) as Record<
    (typeof ARTICLE_CATEGORIES)[number],
    number
  >;

  if (fs.existsSync(articlesDir)) {
    for (const name of fs.readdirSync(articlesDir)) {
      if (!name.endsWith('.md') && !name.endsWith('.mdx')) continue;
      const raw = fs.readFileSync(path.join(articlesDir, name), 'utf8');
      const data = parseFrontmatter(raw);
      const category = String(data.category ?? '');
      if (!(category in counts)) continue;
      if (!isIndexableArticleFile(raw, data)) continue;
      counts[category as (typeof ARTICLE_CATEGORIES)[number]] += 1;
    }
  }

  return ARTICLE_CATEGORIES.filter((slug) => counts[slug] === 0).map(
    (slug) => CATEGORIES[slug].href,
  );
}

export function shouldOmitFromSitemap(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (NOINDEX_PATHS.has(normalized)) return true;
  if (normalized === '/search-index.json' || normalized === '/robots.txt') return true;
  if (getEmptyCategoryHubPaths().includes(normalized)) return true;
  if (normalized === '/calculators' && !hasAvailableTools()) return true;
  return false;
}
