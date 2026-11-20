/**
 * Concrete Calculator — pure calculation + validation.
 * Internal volume base: cubic feet.
 */
import {
  type LengthUnit,
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  toFeet,
} from './length-units.ts';

export type ConcreteMode = 'rectangle' | 'circle' | 'posts';

export type FieldError = { field: string; message: string };

export type ConcreteCalcResult =
  | { ok: true; result: ConcreteResult }
  | { ok: false; errors: FieldError[] };

export interface ConcreteBagYield {
  label: string;
  weightLb: 40 | 50 | 60 | 80;
  /** Approximate yield in ft³ (QUIKRETE Concrete Mix #1101). */
  yieldFt3: number;
}

/** FACT: QUIKRETE Concrete Mix #1101 approximate yields. */
export const CONCRETE_BAG_YIELDS: readonly ConcreteBagYield[] = [
  { label: '40 lb', weightLb: 40, yieldFt3: 0.3 },
  { label: '50 lb', weightLb: 50, yieldFt3: 0.375 },
  { label: '60 lb', weightLb: 60, yieldFt3: 0.45 },
  { label: '80 lb', weightLb: 80, yieldFt3: 0.6 },
] as const;

export const CONCRETE_EXTRA_PRESETS = [0, 5, 10] as const;
export const DEFAULT_EXTRA_PERCENT = 10;
export const MAX_CUSTOM_EXTRA_PERCENT = 25;

/** Soft warning threshold (feet). Still calculates. */
export const LARGE_DIMENSION_WARNING_FT = 200;

/** Hard reject absurd linear sizes (feet). */
export const MAX_LINEAR_FT = 100_000;

export interface ConcreteInput {
  mode: ConcreteMode;
  /** Extra material percent 0–25. */
  extraPercent: number;
  length?: number;
  lengthUnit?: LengthUnit;
  width?: number;
  widthUnit?: LengthUnit;
  thickness?: number;
  thicknessUnit?: LengthUnit;
  diameter?: number;
  diameterUnit?: LengthUnit;
  depth?: number;
  depthUnit?: LengthUnit;
  holeCount?: number;
}

export interface ConcreteBagCount {
  label: string;
  weightLb: 40 | 50 | 60 | 80;
  yieldFt3: number;
  bags: number;
}

export interface ConcreteResult {
  mode: ConcreteMode;
  extraPercent: number;
  rawFt3: number;
  purchaseFt3: number;
  rawYd3: number;
  purchaseYd3: number;
  rawM3: number;
  purchaseM3: number;
  extraFt3: number;
  extraYd3: number;
  bags: ConcreteBagCount[];
  /** Soft UX warning; calculation still succeeded. */
  warnings: string[];
  /** Normalized feet used (for SVG / debugging). */
  dimensionsFt: {
    lengthFt?: number;
    widthFt?: number;
    thicknessFt?: number;
    diameterFt?: number;
    depthFt?: number;
    holeCount?: number;
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseRequiredPositive(
  value: unknown,
  field: string,
  label: string,
  errors: FieldError[],
): number | null {
  if (value === undefined || value === null || value === '') {
    errors.push({ field, message: `${label} is required.` });
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFiniteNumber(n)) {
    errors.push({ field, message: `${label} must be a valid number.` });
    return null;
  }
  if (n <= 0) {
    errors.push({ field, message: `${label} must be greater than zero.` });
    return null;
  }
  return n;
}

function parseExtraPercent(value: unknown, errors: FieldError[]): number | null {
  if (value === undefined || value === null || value === '') {
    errors.push({ field: 'extraPercent', message: 'Extra material percent is required.' });
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFiniteNumber(n)) {
    errors.push({ field: 'extraPercent', message: 'Extra material must be a valid number.' });
    return null;
  }
  if (n < 0 || n > MAX_CUSTOM_EXTRA_PERCENT) {
    errors.push({
      field: 'extraPercent',
      message: `Extra material must be between 0 and ${MAX_CUSTOM_EXTRA_PERCENT}%.`,
    });
    return null;
  }
  return n;
}

function parseHoleCount(value: unknown, errors: FieldError[]): number | null {
  if (value === undefined || value === null || value === '') {
    errors.push({ field: 'holeCount', message: 'Number of holes is required.' });
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFiniteNumber(n) || !Number.isInteger(n) || n < 1) {
    errors.push({ field: 'holeCount', message: 'Number of holes must be a whole number of at least 1.' });
    return null;
  }
  return n;
}

function requireUnit(
  unit: LengthUnit | undefined,
  field: string,
  errors: FieldError[],
): LengthUnit | null {
  if (!unit) {
    errors.push({ field, message: 'Unit is required.' });
    return null;
  }
  return unit;
}

function checkLinearSize(ft: number, field: string, label: string, errors: FieldError[], warnings: string[]) {
  if (ft > MAX_LINEAR_FT) {
    errors.push({ field, message: `${label} is too large to calculate safely.` });
    return;
  }
  if (ft > LARGE_DIMENSION_WARNING_FT) {
    warnings.push(
      `${label} is unusually large (${ft.toFixed(1)} ft). Double-check your units and measurements.`,
    );
  }
}

export function rectangularVolumeFt3(lengthFt: number, widthFt: number, thicknessFt: number): number {
  return lengthFt * widthFt * thicknessFt;
}

export function cylindricalVolumeFt3(diameterFt: number, heightFt: number): number {
  const radius = diameterFt / 2;
  return Math.PI * radius * radius * heightFt;
}

export function postHolesVolumeFt3(
  diameterFt: number,
  depthFt: number,
  holeCount: number,
): number {
  return holeCount * cylindricalVolumeFt3(diameterFt, depthFt);
}

export function applyExtraMaterial(rawFt3: number, extraPercent: number): {
  purchaseFt3: number;
  extraFt3: number;
} {
  const extraFraction = extraPercent / 100;
  const purchaseFt3 = rawFt3 * (1 + extraFraction);
  return { purchaseFt3, extraFt3: purchaseFt3 - rawFt3 };
}

export function bagsForPurchase(purchaseFt3: number): ConcreteBagCount[] {
  return CONCRETE_BAG_YIELDS.map((bag) => ({
    label: bag.label,
    weightLb: bag.weightLb,
    yieldFt3: bag.yieldFt3,
    bags: Math.ceil(purchaseFt3 / bag.yieldFt3),
  }));
}

/** Format helpers for display (do not use inside math). */
export function formatYd3(value: number): string {
  return value.toFixed(2);
}

export function formatFt3(value: number): string {
  return value.toFixed(2);
}

export function formatM3(value: number): string {
  return value.toFixed(3);
}

export function calculateConcrete(input: ConcreteInput): ConcreteCalcResult {
  const errors: FieldError[] = [];
  const warnings: string[] = [];

  if (input.mode !== 'rectangle' && input.mode !== 'circle' && input.mode !== 'posts') {
    errors.push({ field: 'mode', message: 'Select a project type.' });
    return { ok: false, errors };
  }

  const extraPercent = parseExtraPercent(input.extraPercent, errors);
  if (extraPercent === null) return { ok: false, errors };

  let rawFt3 = 0;
  const dimensionsFt: ConcreteResult['dimensionsFt'] = {};

  if (input.mode === 'rectangle') {
    const length = parseRequiredPositive(input.length, 'length', 'Length', errors);
    const width = parseRequiredPositive(input.width, 'width', 'Width', errors);
    const thickness = parseRequiredPositive(input.thickness, 'thickness', 'Thickness', errors);
    const lengthUnit = requireUnit(input.lengthUnit, 'lengthUnit', errors);
    const widthUnit = requireUnit(input.widthUnit, 'widthUnit', errors);
    const thicknessUnit = requireUnit(input.thicknessUnit, 'thicknessUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (
      length === null ||
      width === null ||
      thickness === null ||
      !lengthUnit ||
      !widthUnit ||
      !thicknessUnit
    ) {
      return { ok: false, errors };
    }

    const lengthFt = toFeet(length, lengthUnit);
    const widthFt = toFeet(width, widthUnit);
    const thicknessFt = toFeet(thickness, thicknessUnit);
    checkLinearSize(lengthFt, 'length', 'Length', errors, warnings);
    checkLinearSize(widthFt, 'width', 'Width', errors, warnings);
    checkLinearSize(thicknessFt, 'thickness', 'Thickness', errors, warnings);
    if (errors.length) return { ok: false, errors };

    rawFt3 = rectangularVolumeFt3(lengthFt, widthFt, thicknessFt);
    dimensionsFt.lengthFt = lengthFt;
    dimensionsFt.widthFt = widthFt;
    dimensionsFt.thicknessFt = thicknessFt;
  } else if (input.mode === 'circle') {
    const diameter = parseRequiredPositive(input.diameter, 'diameter', 'Diameter', errors);
    const thickness = parseRequiredPositive(input.thickness, 'thickness', 'Thickness', errors);
    const diameterUnit = requireUnit(input.diameterUnit, 'diameterUnit', errors);
    const thicknessUnit = requireUnit(input.thicknessUnit, 'thicknessUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (diameter === null || thickness === null || !diameterUnit || !thicknessUnit) {
      return { ok: false, errors };
    }

    const diameterFt = toFeet(diameter, diameterUnit);
    const thicknessFt = toFeet(thickness, thicknessUnit);
    checkLinearSize(diameterFt, 'diameter', 'Diameter', errors, warnings);
    checkLinearSize(thicknessFt, 'thickness', 'Thickness', errors, warnings);
    if (errors.length) return { ok: false, errors };

    rawFt3 = cylindricalVolumeFt3(diameterFt, thicknessFt);
    dimensionsFt.diameterFt = diameterFt;
    dimensionsFt.thicknessFt = thicknessFt;
  } else {
    const diameter = parseRequiredPositive(input.diameter, 'diameter', 'Hole diameter', errors);
    const depth = parseRequiredPositive(input.depth, 'depth', 'Hole depth', errors);
    const holeCount = parseHoleCount(input.holeCount, errors);
    const diameterUnit = requireUnit(input.diameterUnit, 'diameterUnit', errors);
    const depthUnit = requireUnit(input.depthUnit, 'depthUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (
      diameter === null ||
      depth === null ||
      holeCount === null ||
      !diameterUnit ||
      !depthUnit
    ) {
      return { ok: false, errors };
    }

    const diameterFt = toFeet(diameter, diameterUnit);
    const depthFt = toFeet(depth, depthUnit);
    checkLinearSize(diameterFt, 'diameter', 'Hole diameter', errors, warnings);
    checkLinearSize(depthFt, 'depth', 'Hole depth', errors, warnings);
    if (errors.length) return { ok: false, errors };

    rawFt3 = postHolesVolumeFt3(diameterFt, depthFt, holeCount);
    dimensionsFt.diameterFt = diameterFt;
    dimensionsFt.depthFt = depthFt;
    dimensionsFt.holeCount = holeCount;
  }

  if (!Number.isFinite(rawFt3) || rawFt3 < 0) {
    return {
      ok: false,
      errors: [{ field: 'mode', message: 'Could not calculate a valid volume from these inputs.' }],
    };
  }

  const { purchaseFt3, extraFt3 } = applyExtraMaterial(rawFt3, extraPercent);
  if (!Number.isFinite(purchaseFt3)) {
    return {
      ok: false,
      errors: [{ field: 'mode', message: 'Could not calculate a valid purchase volume.' }],
    };
  }

  return {
    ok: true,
    result: {
      mode: input.mode,
      extraPercent,
      rawFt3,
      purchaseFt3,
      rawYd3: cubicFeetToCubicYards(rawFt3),
      purchaseYd3: cubicFeetToCubicYards(purchaseFt3),
      rawM3: cubicFeetToCubicMeters(rawFt3),
      purchaseM3: cubicFeetToCubicMeters(purchaseFt3),
      extraFt3,
      extraYd3: cubicFeetToCubicYards(extraFt3),
      bags: bagsForPurchase(purchaseFt3),
      warnings,
      dimensionsFt,
    },
  };
}
