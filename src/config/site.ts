/**
 * Central site identity — edit this file first when configuring a new niche.
 * Keep SITE_URL in sync with Astro `site` (imported by astro.config.mjs).
 */
export const SITE_NAME = 'Site Starter';
export const SITE_TAGLINE = 'A reusable starter for niche SEO content sites.';
export const SITE_URL = 'https://example.com';
export const SITE_DESCRIPTION =
  'Neutral demo site for the SEO site starter. Replace this description when you configure a real niche.';

/** Default byline for articles and About page. */
export const SITE_AUTHOR = 'Site Starter Editorial Team';

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
export const FOOTER_BLURB = `${SITE_NAME} is a demo starter awaiting your niche branding, categories, and content. Contact: ${CONTACT_EMAIL}.`;

/**
 * Suggested search chips on /search.
 * Replace with niche phrases that match published content.
 */
export const SEARCH_SUGGESTIONS = [
  'getting started',
  'how to configure',
  'content checklist',
] as const;
