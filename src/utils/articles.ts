import { getCollection, type CollectionEntry } from 'astro:content';
import type { ArticleCategory } from '../config/categories';
import { categoryMeta } from '../config/categories';
import { reviewCopy, type ReviewLevel } from '../config/review';
import { isIndexableArticle } from './indexing';

export type ArticleEntry = CollectionEntry<'articles'>;

export { categoryMeta };

export function articlePath(
  article: ArticleEntry | { data: { category: ArticleCategory; slug: string } },
): string {
  return `/${article.data.category}/${article.data.slug}`;
}

export async function getAllArticles({
  includeDrafts = false,
  includeNoindex = false,
}: {
  includeDrafts?: boolean;
  includeNoindex?: boolean;
} = {}): Promise<ArticleEntry[]> {
  try {
    const articles = await getCollection('articles');
    return articles
      .filter((article) => {
        if (!includeDrafts && article.data.draft) return false;
        if (!includeNoindex && article.data.noindex) return false;
        return true;
      })
      .sort((a, b) => b.data.publishedDate.valueOf() - a.data.publishedDate.valueOf());
  } catch {
    // Astro may throw when the articles collection has zero matching files.
    return [];
  }
}

export async function getIndexableArticles(): Promise<ArticleEntry[]> {
  try {
    const articles = await getCollection('articles');
    return articles
      .filter(isIndexableArticle)
      .sort((a, b) => b.data.publishedDate.valueOf() - a.data.publishedDate.valueOf());
  } catch {
    // Astro may throw when the articles collection has zero matching files.
    return [];
  }
}

export async function getArticlesByCategory(
  category: ArticleCategory,
): Promise<ArticleEntry[]> {
  const articles = await getIndexableArticles();
  return articles.filter((article) => article.data.category === category);
}

export async function getFeaturedArticles(limit = 6): Promise<ArticleEntry[]> {
  const articles = await getIndexableArticles();
  const featured = articles.filter((article) => article.data.featured);
  const pool = featured.length > 0 ? featured : articles;
  return pool.slice(0, limit);
}

export async function getRelatedArticles(article: ArticleEntry): Promise<ArticleEntry[]> {
  if (article.data.relatedArticles.length === 0) return [];

  const all = await getIndexableArticles();
  const bySlug = new Map(all.map((entry) => [entry.data.slug, entry]));

  return article.data.relatedArticles
    .map((slug) => bySlug.get(slug))
    .filter((entry): entry is ArticleEntry => entry !== undefined && entry.id !== article.id);
}

export function articleBreadcrumbs(article: ArticleEntry): { label: string; href?: string }[] {
  const category = categoryMeta[article.data.category];
  return [
    { label: 'Home', href: '/' },
    { label: category.label, href: category.href },
    { label: article.data.title },
  ];
}

export function formatArticleDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function getValidFaq(article: ArticleEntry): { question: string; answer: string }[] {
  return article.data.faq.filter((item) => {
    const answer = item.answer.trim();
    const question = item.question.trim();
    if (!question || !answer) return false;
    const placeholderPattern =
      /\[?\s*placeholder\s*\]?|research needed|to be researched|todo:|tbd\b/i;
    return !placeholderPattern.test(answer) && !placeholderPattern.test(question);
  });
}

export function getReviewCallout(level: ReviewLevel) {
  return reviewCopy(level);
}

/** Group indexable articles by subcategory for hub rendering. */
export function groupBySubcategory(
  articles: ArticleEntry[],
): { key: string; label: string; articles: ArticleEntry[] }[] {
  const groups = new Map<string, ArticleEntry[]>();

  for (const article of articles) {
    const key = article.data.subcategory?.trim() || 'general';
    const list = groups.get(key) ?? [];
    list.push(article);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const category = items[0]?.data.category;
      const label =
        (category && categoryMeta[category].subcategories?.[key]) ||
        key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return { key, label, articles: items };
    });
}
