import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { ARTICLE_CATEGORIES } from './config/categories';
import { EDITORIAL_FORMATS, IMAGE_KINDS } from './config/editorial';
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
      /** Editorial format label (Worked Example, Decision Guide, etc.). */
      editorialFormat: z.enum(EDITORIAL_FORMATS).optional(),
      publishedDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().min(1),
      reviewedBy: z.string().optional(),
      tags: z.array(z.string()).default([]),
      featuredImage: z.string().optional(),
      featuredImageAlt: z.string().optional(),
      /** Caption under the featured figure (illustrations get a default disclosure). */
      featuredImageCaption: z.string().optional(),
      /** photo = real photography; illustration = explanatory diagram (may be AI-labeled). */
      featuredImageKind: z.enum(IMAGE_KINDS).optional(),
      /**
       * Optional inline real-world photo (distinct from featured illustration).
       * Omit until a verified photo is available — do not ship broken placeholders.
       */
      photo: z.string().optional(),
      photoAlt: z.string().optional(),
      photoCaption: z.string().optional(),
      photoCredit: z.string().optional(),
      draft: z.boolean().default(true),
      noindex: z.boolean().default(false),
      sources: z.array(sourceSchema).default([]),
      relatedArticles: z.array(z.string()).default([]),
      /** Generic review/risk level — redefine copy in src/config/review.ts */
      reviewLevel: z.enum(REVIEW_LEVELS).default('general'),
      /**
       * Optional article-specific planning note.
       * When set, replaces the generic review-level callout for this article.
       */
      planningNote: z
        .object({
          title: z.string().min(1),
          body: z.string().optional(),
          bullets: z.array(z.string().min(1)).default([]),
        })
        .superRefine((note, ctx) => {
          if (!note.body?.trim() && note.bullets.length === 0) {
            ctx.addIssue({
              code: 'custom',
              message: 'planningNote requires body or bullets',
            });
          }
        })
        .optional(),
      featured: z.boolean().default(false),
      /** When true, skip the layout-injected calculator callout (article may include its own). */
      suppressCalculatorCallout: z.boolean().default(false),
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
      if (data.photo && !data.photoAlt?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'photoAlt is required when photo is set',
          path: ['photoAlt'],
        });
      }
    }),
});

export const collections = { articles };
