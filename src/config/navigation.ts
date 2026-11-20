import { ARTICLE_CATEGORIES, CATEGORIES } from './categories';
import { FOOTER_BLURB } from './site';

export type NavItem = { label: string; href: string };

/**
 * Primary and footer navigation.
 * Category links are derived from `CATEGORIES` so a category reset does not require
 * editing slug-specific keys here — only optional non-category links below.
 */
const categoryNav: NavItem[] = ARTICLE_CATEGORIES.map((slug) => ({
  label: CATEGORIES[slug].label,
  href: CATEGORIES[slug].href,
}));

export const primaryNav: NavItem[] = [
  ...categoryNav,
  { label: 'Calculators', href: '/calculators' },
  { label: 'About', href: '/about' },
];

export const footerNav = {
  explore: [
    ...categoryNav,
    { label: 'Calculators', href: '/calculators' },
    { label: 'Search', href: '/search' },
  ] satisfies NavItem[],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ] satisfies NavItem[],
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Disclaimer', href: '/disclaimer' },
  ] satisfies NavItem[],
};

/** Re-export so Footer can import from navigation. Edit copy in site.ts. */
export const footerBlurb = FOOTER_BLURB;
