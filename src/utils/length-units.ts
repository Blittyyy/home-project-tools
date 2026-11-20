/**
 * Shared length-unit helpers for material calculators.
 * International foot: 1 ft = 0.3048 m (exact).
 */

export const LENGTH_UNITS = ['ft', 'in', 'm', 'cm'] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

/** Exact: 1 ft = 0.3048 m */
export const METERS_PER_FOOT = 0.3048;

/** Exact: 1 ft³ = (0.3048)³ m³ */
export const CUBIC_METERS_PER_CUBIC_FOOT = METERS_PER_FOOT ** 3; // 0.028316846592

/** Exact: 1 yd³ = 27 ft³ */
export const CUBIC_FEET_PER_CUBIC_YARD = 27;

export function isLengthUnit(value: string): value is LengthUnit {
  return (LENGTH_UNITS as readonly string[]).includes(value);
}

/** Convert a length to feet. */
export function toFeet(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'ft':
      return value;
    case 'in':
      return value / 12;
    case 'm':
      return value / METERS_PER_FOOT;
    case 'cm':
      return value / 30.48;
  }
}

/** Convert feet to another length unit (for unit-switch UX). */
export function fromFeet(valueFt: number, unit: LengthUnit): number {
  switch (unit) {
    case 'ft':
      return valueFt;
    case 'in':
      return valueFt * 12;
    case 'm':
      return valueFt * METERS_PER_FOOT;
    case 'cm':
      return valueFt * 30.48;
  }
}

export function cubicFeetToCubicYards(ft3: number): number {
  return ft3 / CUBIC_FEET_PER_CUBIC_YARD;
}

export function cubicFeetToCubicMeters(ft3: number): number {
  return ft3 * CUBIC_METERS_PER_CUBIC_FOOT;
}
