/**
 * Generic review / risk taxonomy for article callouts.
 * Redesign values and copy for each niche — do not reuse domain-specific safety models.
 */
export const REVIEW_LEVELS = ['none', 'general', 'caution', 'professional'] as const;

export type ReviewLevel = (typeof REVIEW_LEVELS)[number];

export const REVIEW_COPY: Record<
  ReviewLevel,
  { title: string; body: string } | null
> = {
  none: null,
  general: {
    title: 'General note',
    body: 'This page is informational. Confirm details against primary sources for your situation before acting.',
  },
  caution: {
    title: 'Use caution',
    body: 'This topic can have meaningful downsides if handled incorrectly. Prefer conservative steps and verify with authoritative guidance for your niche.',
  },
  professional: {
    title: 'Professional help recommended',
    body: 'This topic typically requires a qualified professional. Do not treat this page as a substitute for licensed advice or hands-on expertise.',
  },
};

export function reviewCopy(level: ReviewLevel): { title: string; body: string } | null {
  return REVIEW_COPY[level];
}
