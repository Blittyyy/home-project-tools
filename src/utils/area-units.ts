/**
 * Shared area-unit helpers for material calculators.
 * International foot: 1 ft = 0.3048 m (exact).
 */
import { METERS_PER_FOOT } from './length-units.ts';

export const AREA_UNITS = ['sq_ft', 'sq_yd', 'm2'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

/** Exact: 1 yd² = 9 ft² */
export const SQUARE_FEET_PER_SQUARE_YARD = 9;

/** Exact: 1 m² = 1 / (0.3048)² ft² */
export const SQUARE_FEET_PER_SQUARE_METER = 1 / (METERS_PER_FOOT * METERS_PER_FOOT);

export function isAreaUnit(value: string): value is AreaUnit {
  return (AREA_UNITS as readonly string[]).includes(value);
}

/** Convert an area to square feet. */
export function toSquareFeet(value: number, unit: AreaUnit): number {
  switch (unit) {
    case 'sq_ft':
      return value;
    case 'sq_yd':
      return value * SQUARE_FEET_PER_SQUARE_YARD;
    case 'm2':
      return value * SQUARE_FEET_PER_SQUARE_METER;
  }
}

/** Convert square feet to another area unit (for unit-switch UX). */
export function fromSquareFeet(valueSqFt: number, unit: AreaUnit): number {
  switch (unit) {
    case 'sq_ft':
      return valueSqFt;
    case 'sq_yd':
      return valueSqFt / SQUARE_FEET_PER_SQUARE_YARD;
    case 'm2':
      return valueSqFt / SQUARE_FEET_PER_SQUARE_METER;
  }
}
