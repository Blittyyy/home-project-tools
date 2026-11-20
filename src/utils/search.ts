import { getIndexableArticles, articlePath, categoryMeta } from './articles';
import { ARTICLE_CATEGORIES } from '../config/categories';
import type { SearchDocument } from './search-rank';

export type { SearchDocument, SearchResult } from './search-rank';
export { searchArticles, suggestArticles } from './search-rank';
export { SEARCH_SUGGESTIONS } from '../config/site';

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, ' ')
    .replace(/^\s*\d+\.\s+/gm, ' ')
    .replace(/[*_~>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

export async function buildSearchIndex(): Promise<SearchDocument[]> {
  const articles = await getIndexableArticles();

  return articles.flatMap((article) => {
    const category = article.data.category;
    const meta = categoryMeta[category];
    // Skip entries whose category is no longer in the closed set (stale content cache).
    if (!meta) return [];
    return [
      {
        slug: article.data.slug,
        title: article.data.title,
        description: article.data.description,
        summary: article.data.summary ?? '',
        category,
        categoryLabel: meta.label,
        subcategory: article.data.subcategory ?? '',
        tags: article.data.tags ?? [],
        href: articlePath(article),
        body: stripMarkdown(article.body ?? ''),
      },
    ];
  });
}

export function categorySuggestions(): { label: string; href: string; description: string }[] {
  return ARTICLE_CATEGORIES.map((key) => ({
    label: categoryMeta[key].label,
    href: categoryMeta[key].href,
    description: categoryMeta[key].description,
  }));
}
