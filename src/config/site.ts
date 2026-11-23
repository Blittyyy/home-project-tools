/**
 * FixUpWise site identity.
 * Keep SITE_URL in sync with Astro `site` (imported by astro.config.mjs).
 * Do not invent entity, address, monitored email, or production domain here.
 */
export const SITE_NAME = 'FixUpWise';
export const SITE_TAGLINE = 'Home projects, DIY & smart upgrades for every home';
export const SITE_URL = 'https://example.com';
export const SITE_DESCRIPTION =
  'Practical home-improvement guidance and project calculators for homeowners and DIYers. Plan materials, estimate quantities, and get clear how-to context before you buy.';

/** Default byline for articles and About page. */
export const SITE_AUTHOR = 'FixUpWise Editorial';

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
export const FOOTER_BLURB = `${SITE_NAME} publishes practical home project information, DIY planning guidance, and transparent material calculators. Planning estimates only — not engineering, code approval, or contractor bids. Contact: ${CONTACT_EMAIL}.`;

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
