/**
 * Content categories — closed set used by schema, hubs, and navigation.
 * Calculator discovery groups live in src/data/tools.ts, not here.
 */
export const ARTICLE_CATEGORIES = ['projects', 'materials', 'guides'] as const;

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
  projects: {
    slug: 'projects',
    label: 'Projects',
    description:
      'Project planning guides that help you scope home improvement jobs and decide what to measure before you buy materials.',
    href: '/projects',
    subcategories: {
      outdoor: 'Outdoor',
      indoor: 'Indoor',
      planning: 'Planning',
      painting: 'Painting',
      concrete: 'Concrete',
      landscaping: 'Landscaping',
    },
  },
  materials: {
    slug: 'materials',
    label: 'Materials',
    description:
      'Material coverage, package sizes, waste norms, and buying guidance that support the calculators.',
    href: '/materials',
    subcategories: {
      coverage: 'Coverage',
      packaging: 'Packaging',
      waste: 'Waste factors',
      paint: 'Paint',
      concrete: 'Concrete',
      mulch: 'Mulch',
    },
  },
  guides: {
    slug: 'guides',
    label: 'Guides',
    description:
      'How-to and reference guides for measuring, converting units, and using planning estimates responsibly.',
    href: '/guides',
    subcategories: {
      measuring: 'Measuring & Estimating',
      conversions: 'Conversions',
      reference: 'Reference',
      painting: 'Painting',
      landscaping: 'Landscaping',
    },
  },
};

export const categoryMeta = CATEGORIES;
