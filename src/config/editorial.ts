/**
 * Lightweight editorial format taxonomy.
 * Assign per article; do not retrofit the full archive until each piece is reviewed.
 */
export const EDITORIAL_FORMATS = [
  'worked-example',
  'decision-guide',
  'quick-reference',
  'material-guide',
  'material-reference',
  'project-planner',
  'product-reference',
  'measuring-guide',
  'size-reference',
  'packaging-guide',
] as const;

export type EditorialFormat = (typeof EDITORIAL_FORMATS)[number];

export const EDITORIAL_FORMAT_LABELS: Record<EditorialFormat, string> = {
  'worked-example': 'Worked Example',
  'decision-guide': 'Decision Guide',
  'quick-reference': 'Quick Reference',
  'material-guide': 'Material Guide',
  'material-reference': 'Material Reference',
  'project-planner': 'Project Planner',
  'product-reference': 'Product Reference',
  'measuring-guide': 'Measuring Guide',
  'size-reference': 'Size Reference',
  'packaging-guide': 'Packaging Guide',
};

export const IMAGE_KINDS = ['photo', 'illustration'] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

/** Default caption for labeled AI explanatory illustrations. */
export const ILLUSTRATION_DISCLOSURE = 'Illustration: AI-generated for explanatory use.';

/** Methodology page path — linked from bylines, About, and footer. */
export const METHODOLOGY_PATH = '/about/how-we-create-content';
