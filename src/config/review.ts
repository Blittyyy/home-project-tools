/**
 * Review / risk taxonomy for article and tool callouts.
 * Levels are reusable; copy is tuned for home-project planning estimates.
 */
export const REVIEW_LEVELS = ['none', 'general', 'caution', 'professional'] as const;

export type ReviewLevel = (typeof REVIEW_LEVELS)[number];

export const REVIEW_COPY: Record<
  ReviewLevel,
  { title: string; body: string } | null
> = {
  none: null,
  general: {
    title: 'Planning estimate',
    body: 'This page helps with DIY planning math. Confirm measurements, package labels, and site conditions before you buy or install.',
  },
  caution: {
    title: 'Check assumptions carefully',
    body: 'Wrong dimensions, coverage rates, or waste factors can waste material or leave you short. Treat defaults as starting assumptions and verify against manufacturer instructions for your product.',
  },
  professional: {
    title: 'Professional help recommended',
    body: 'This topic can involve structural, electrical, plumbing, code, or other safety-critical decisions. Do not treat this page as engineering advice, code approval, or a substitute for a qualified professional.',
  },
};

export function reviewCopy(level: ReviewLevel): { title: string; body: string } | null {
  return REVIEW_COPY[level];
}
