/**
 * Calculator / tool registry for the calculators hub.
 * Add new tools here after implementing util → component → page → tests.
 * Coming-soon entries are hub cards only — they must not create tool routes.
 */

export const TOOL_GROUPS = [
  'concrete-masonry',
  'paint-walls',
  'flooring-tile',
  'landscaping',
  'decks-fences',
  'lumber-wood',
  'general-measurements',
] as const;

export type ToolGroup = (typeof TOOL_GROUPS)[number];

export const TOOL_GROUP_LABELS: Record<ToolGroup, string> = {
  'concrete-masonry': 'Concrete & Masonry',
  'paint-walls': 'Paint & Walls',
  'flooring-tile': 'Flooring & Tile',
  landscaping: 'Landscaping',
  'decks-fences': 'Decks & Fences',
  'lumber-wood': 'Lumber & Wood',
  'general-measurements': 'General Measurements',
};

export type ToolStatus = 'available' | 'coming-soon';

export interface ToolDefinition {
  slug: string;
  name: string;
  description: string;
  group: ToolGroup;
  /** Only used when status is `available`. Coming-soon cards do not link. */
  href: string;
  status: ToolStatus;
}

export const CALCULATORS_HUB = {
  title: 'Calculators',
  description:
    'Material and project planning calculators for homeowners and DIYers. Estimate quantities, waste allowance, and package counts before you buy.',
  lede: 'Client-side planning tools that stay in your browser. Results are estimates for shopping and planning — not engineering, code approval, or contractor bids.',
} as const;

/**
 * Coming-soon entries are hub cards only — they must not create tool routes.
 * Available tools must point at a real calculator page.
 */
export const tools: ToolDefinition[] = [
  {
    slug: 'concrete-calculator',
    name: 'Concrete Calculator',
    description:
      'Estimate concrete volume in cubic yards and bags for slabs, circular pads, and post holes.',
    group: 'concrete-masonry',
    href: '/calculators/concrete-calculator',
    status: 'available',
  },
  {
    slug: 'gravel-calculator',
    name: 'Gravel Calculator',
    description:
      'Estimate gravel volume in cubic yards and approximate tons for paths, bases, and beds.',
    group: 'landscaping',
    href: '/calculators/gravel-calculator',
    status: 'available',
  },
  {
    slug: 'mulch-calculator',
    name: 'Mulch Calculator',
    description:
      'Estimate mulch volume in cubic yards and bags for beds, with optional overage and bag-size comparison.',
    group: 'landscaping',
    href: '/calculators/mulch-calculator',
    status: 'available',
  },
  {
    slug: 'paint-calculator',
    name: 'Paint Calculator',
    description:
      'Estimate paint gallons for rooms, walls, or a known area, with coats, coverage, and optional openings.',
    group: 'paint-walls',
    href: '/calculators/paint-calculator',
    status: 'available',
  },
  {
    slug: 'tile-calculator',
    name: 'Tile Calculator',
    description:
      'Estimate tiles and boxes for a rectangular or known-area project, with layout waste and package information.',
    group: 'flooring-tile',
    href: '/calculators/tile-calculator',
    status: 'available',
  },
];

export function getAvailableTools(): ToolDefinition[] {
  return tools.filter((tool) => tool.status === 'available');
}

export function hasAvailableTools(): boolean {
  return getAvailableTools().length > 0;
}

export function getToolsByGroup(group: ToolGroup): ToolDefinition[] {
  return tools.filter((tool) => tool.group === group);
}

export function getToolGroupLabel(group: ToolGroup): string {
  return TOOL_GROUP_LABELS[group];
}
