/**
 * Calculator / tool registry for the calculators hub.
 * Add new tools here after implementing util → component → page → tests.
 */
export type ToolStatus = 'available' | 'coming-soon';

export interface ToolDefinition {
  slug: string;
  name: string;
  description: string;
  /** Only used when status is `available`. Coming-soon cards do not link. */
  href: string;
  status: ToolStatus;
}

export const CALCULATORS_HUB = {
  title: 'Calculators',
  description:
    'Simple client-side calculators and planning tools. Demo hub for the SEO site starter.',
  lede: 'Client-side tools that stay in the browser. Replace the demo calculator when your niche has accurate formulas.',
} as const;

export const tools: ToolDefinition[] = [
  {
    slug: 'rectangle-area',
    name: 'Rectangle Area Calculator',
    description:
      'Estimate the area of a rectangle from width, height, and unit. Harmless demo tool for the starter architecture.',
    href: '/calculators/rectangle-area',
    status: 'available',
  },
  {
    slug: 'coming-soon-demo',
    name: 'Coming Soon Demo Tool',
    description:
      'Placeholder card showing how future tools appear on the hub before they ship.',
    // Not linked by ToolCard while status is coming-soon (safe non-route sentinel).
    href: '#coming-soon',
    status: 'coming-soon',
  },
];

export function getAvailableTools(): ToolDefinition[] {
  return tools.filter((tool) => tool.status === 'available');
}

export function hasAvailableTools(): boolean {
  return getAvailableTools().length > 0;
}
