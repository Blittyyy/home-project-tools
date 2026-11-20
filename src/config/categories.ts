/**
 * Content categories — closed set used by schema, hubs, and navigation.
 * Replace slugs/labels/descriptions when defining a new niche.
 */
export const ARTICLE_CATEGORIES = ['guides', 'how-to', 'reference'] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export interface CategoryDefinition {
  slug: ArticleCategory;
  label: string;
  description: string;
  href: string;
  /** Optional subcategory labels used for hub grouping copy. */
  subcategories?: Record<string, string>;
}

export const CATEGORIES: Record<ArticleCategory, CategoryDefinition> = {
  guides: {
    slug: 'guides',
    label: 'Guides',
    description:
      'Longer overview articles that explain a topic end-to-end. Demo category for the starter.',
    href: '/guides',
    subcategories: {
      overview: 'Overviews',
      planning: 'Planning',
    },
  },
  'how-to': {
    slug: 'how-to',
    label: 'How-To',
    description:
      'Step-by-step instructional articles. Demo category for the starter.',
    href: '/how-to',
    subcategories: {
      setup: 'Setup',
      workflow: 'Workflow',
    },
  },
  reference: {
    slug: 'reference',
    label: 'Reference',
    description:
      'Short reference pages and definitions. Demo category for the starter.',
    href: '/reference',
    subcategories: {
      glossary: 'Glossary',
      checklists: 'Checklists',
    },
  },
};

export const categoryMeta = CATEGORIES;
