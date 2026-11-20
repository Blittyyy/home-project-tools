import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { ARTICLE_CATEGORIES } from './config/categories';
import { REVIEW_LEVELS } from './config/review';

const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().optional(),
  publisher: z.string().optional(),
  accessed: z.string().optional(),
  note: z.string().optional(),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      /** Short answer shown near the top of the article. */
      summary: z.string().optional(),
      slug: z
        .string()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          message: 'slug must be lowercase kebab-case',
        }),
      category: z.enum(ARTICLE_CATEGORIES),
      subcategory: z.string().optional(),
      publishedDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().min(1),
      reviewedBy: z.string().optional(),
      tags: z.array(z.string()).default([]),
      featuredImage: z.string().optional(),
      featuredImageAlt: z.string().optional(),
      draft: z.boolean().default(true),
      noindex: z.boolean().default(false),
      sources: z.array(sourceSchema).default([]),
      relatedArticles: z.array(z.string()).default([]),
      /** Generic review/risk level — redefine copy in src/config/review.ts */
      reviewLevel: z.enum(REVIEW_LEVELS).default('general'),
      featured: z.boolean().default(false),
      affiliateDisclosure: z.boolean().default(false),
      faq: z
        .array(
          z.object({
            question: z.string().min(1),
            answer: z.string().min(1),
          }),
        )
        .default([]),
    })
    .superRefine((data, ctx) => {
      if (data.featuredImage && !data.featuredImageAlt?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'featuredImageAlt is required when featuredImage is set',
          path: ['featuredImageAlt'],
        });
      }
    }),
});

export const collections = { articles };
