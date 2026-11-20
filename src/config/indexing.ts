/** Shared exclusion list for sitemap filters and noindex path checks. */
export const NOINDEX_PATHS = new Set(['/404', '/search']);

export function isNoindexPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return NOINDEX_PATHS.has(normalized);
}
