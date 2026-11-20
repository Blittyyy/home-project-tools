import { ARTICLE_CATEGORIES, CATEGORIES } from './categories';

/** Shared exclusion list for sitemap filters and noindex path checks. */
export const NOINDEX_PATHS = new Set(['/404', '/search']);

export function isNoindexPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return NOINDEX_PATHS.has(normalized);
}

/** Category hub paths derived from the closed category set. */
export function getCategoryHubPaths(): string[] {
  return ARTICLE_CATEGORIES.map((slug) => CATEGORIES[slug].href);
}

export function isCategoryHubPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return getCategoryHubPaths().includes(normalized);
}
