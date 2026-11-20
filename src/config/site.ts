/**
 * Central site identity — temporary working labels until a final brand is chosen.
 * Keep SITE_URL in sync with Astro `site` (imported by astro.config.mjs).
 * Do not invent entity, address, monitored email, or production domain here.
 */
export const SITE_NAME = 'Home Project Tools';
export const SITE_TAGLINE = 'Plan your project before you buy materials.';
export const SITE_URL = 'https://example.com';
export const SITE_DESCRIPTION =
  'Planning utilities for homeowners and DIYers: estimate material quantities, waste allowance, unit conversions, and package counts for home improvement projects.';

/** Default byline for articles and About page. */
export const SITE_AUTHOR = 'Home Project Tools Editorial';

/**
 * Contact email placeholder — replace before launch.
 * Do not invent a real inbox here.
 */
export const CONTACT_EMAIL = '[CONTACT_EMAIL_REQUIRES_REVIEW]';

/** Fallback social / Open Graph image (absolute URL). */
export const DEFAULT_OG_IMAGE_PATH = '/og-default.svg';
export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;

/** Organization metadata for JSON-LD (keep factual; no invented credentials). */
export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
} as const;

/** Footer blurb shown sitewide. */
export const FOOTER_BLURB = `${SITE_NAME} helps homeowners and DIYers estimate materials for home projects. Planning estimates only — not engineering, code approval, or contractor bids. Contact: ${CONTACT_EMAIL}.`;

/**
 * Suggested search chips on /search.
 * Replace with phrases that match published content as articles ship.
 */
export const SEARCH_SUGGESTIONS = [
  'concrete',
  'paint',
  'mulch',
  'gravel',
  'tile',
] as const;
