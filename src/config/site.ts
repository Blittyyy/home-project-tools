/**
 * FixUpWise site identity — single source for launch config.
 * Keep SITE_URL in sync with Astro `site` (imported by astro.config.mjs).
 * Do not invent entity, address, monitored email, or production domain here.
 *
 * Before first production deploy, the site owner must update:
 *   SITE_URL, CONTACT_EMAIL
 * At public launch (after truthful article publishedDate values are set):
 *   SHOW_PUBLIC_ARTICLE_DATES → true
 * CONTACT_EMAIL_READY is derived — do not set it by hand.
 */
export const SITE_NAME = 'FixUpWise';
export const SITE_TAGLINE = 'Home projects, DIY & smart upgrades for every home';
export const SITE_URL = 'https://fixupwise.com';
export const SITE_DESCRIPTION =
  'Practical home-improvement guidance and project calculators for homeowners and DIYers. Plan materials, estimate quantities, and get clear how-to context before you buy.';

/**
 * Default byline for articles and About page.
 * Prefer a real named author when the site owner supplies one.
 * Until then, use the editorial team attribution — never invent a Person.
 */
export const SITE_AUTHOR = 'FixUpWise Editorial Team';

/**
 * When false, article dates stay in frontmatter for internal staging
 * but are omitted from public UI and BlogPosting date fields
 * (site is not yet publicly launched).
 * Flip to true when real publication dates are assigned at launch.
 */
export const SHOW_PUBLIC_ARTICLE_DATES = true;

/**
 * Contact email — replace with a monitored inbox before launch.
 * Do not invent a real address. Keep the review token out of public HTML
 * until CONTACT_EMAIL_READY is true.
 */
export const CONTACT_EMAIL = 'blittywb@gmail.com';

/** Derived from CONTACT_EMAIL — true only when it is a real publishable address. */
export const CONTACT_EMAIL_READY =
  Boolean(CONTACT_EMAIL) &&
  CONTACT_EMAIL.includes('@') &&
  !CONTACT_EMAIL.includes('REQUIRES_REVIEW') &&
  !CONTACT_EMAIL.startsWith('[');

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
export const FOOTER_BLURB =
  'Practical guides, calculators, and reference articles for DIY project planning.';

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
