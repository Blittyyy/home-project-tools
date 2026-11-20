/**
 * Mulch Calculator — pure calculation + validation.
 * Internal volume base: cubic feet. Bag counts use package volume (ft³).
 */
import {
  type LengthUnit,
  CUBIC_FEET_PER_CUBIC_YARD,
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  toFeet,
} from './length-units.ts';
import { type AreaUnit, toSquareFeet } from './area-units.ts';
import { applyExtraMaterial } from './extra-material.ts';

export type MulchMode = 'rectangle' | 'circle' | 'area';

export type FieldError = { field: string; message: string };

export type MulchCalcResult =
  | { ok: true; result: MulchResult }
  | { ok: false; errors: FieldError[] };

export interface MulchBagSize {
  label: string;
  volumeFt3: number;
}

/** Package-volume examples commonly sold in the U.S. (not universal products). */
export const MULCH_BAG_PRESETS: readonly MulchBagSize[] = [
  { label: '1.5 cu ft', volumeFt3: 1.5 },
  { label: '2.0 cu ft', volumeFt3: 2 },
  { label: '3.0 cu ft', volumeFt3: 3 },
] as const;

export const MULCH_EXTRA_PRESETS = [0, 5, 10] as const;
export const DEFAULT_EXTRA_PERCENT = 0;
export const MAX_CUSTOM_EXTRA_PERCENT = 25;

export const MIN_CUSTOM_BAG_FT3 = 0.25;
export const MAX_CUSTOM_BAG_FT3 = 10;

/** Soft horticultural depth band (inches). Still calculates outside this range. */
export const SOFT_DEPTH_LOW_IN = 1;
export const SOFT_DEPTH_HIGH_IN = 4;

/** Soft warning threshold (feet). Still calculates. */
export const LARGE_DIMENSION_WARNING_FT = 200;
/** Soft warning threshold (sq ft). Still calculates. */
export const LARGE_AREA_WARNING_SQ_FT = 40_000;

/** Hard reject absurd linear sizes (feet). */
export const MAX_LINEAR_FT = 100_000;
/** Hard reject absurd area (sq ft). */
export const MAX_AREA_SQ_FT = 1_000_000_000;

export interface MulchInput {
  mode: MulchMode;
  extraPercent: number;
  /** Optional custom bag volume in cubic feet. */
  customBagFt3?: number;
  length?: number;
  lengthUnit?: LengthUnit;
  width?: number;
  widthUnit?: LengthUnit;
  diameter?: number;
  diameterUnit?: LengthUnit;
  area?: number;
  areaUnit?: AreaUnit;
  depth?: number;
  depthUnit?: LengthUnit;
}

export interface MulchBagCount {
  label: string;
  volumeFt3: number;
  bags: number;
  /** True when this row came from the optional custom bag field. */
  isCustom?: boolean;
}

export interface MulchResult {
  mode: MulchMode;
  extraPercent: number;
  rawFt3: number;
  purchaseFt3: number;
  rawYd3: number;
  purchaseYd3: number;
  rawM3: number;
  purchaseM3: number;
  extraFt3: number;
  extraYd3: number;
  bags: MulchBagCount[];
  /** Area of the bed in square feet (for display). */
  areaSqFt: number;
  depthFt: number;
  depthIn: number;
  /** Square feet covered by 1 cubic yard at this depth. */
  coverageSqFtPerYd3: number;
  warnings: string[];
  dimensionsFt: {
    lengthFt?: number;
    widthFt?: number;
    diameterFt?: number;
    depthFt?: number;
    areaSqFt?: number;
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
    errors.push({ field: 'extraPercent', message: 'Optional overage percent is required.' });
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFiniteNumber(n)) {
    errors.push({ field: 'extraPercent', message: 'Optional overage must be a valid number.' });
    return null;
  }
  if (n < 0 || n > MAX_CUSTOM_EXTRA_PERCENT) {
    errors.push({
      field: 'extraPercent',
      message: `Optional overage must be between 0 and ${MAX_CUSTOM_EXTRA_PERCENT}%.`,
    });
    return null;
  }
  return n;
}

/**
 * Custom bag is optional. Empty / undefined → omit.
 * If present, must be finite and within [MIN, MAX].
 */
function parseOptionalCustomBag(
  value: unknown,
  errors: FieldError[],
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFiniteNumber(n)) {
    errors.push({ field: 'customBagFt3', message: 'Custom bag volume must be a valid number.' });
    return undefined;
  }
  if (n < MIN_CUSTOM_BAG_FT3 || n > MAX_CUSTOM_BAG_FT3) {
    errors.push({
      field: 'customBagFt3',
      message: `Custom bag volume must be between ${MIN_CUSTOM_BAG_FT3} and ${MAX_CUSTOM_BAG_FT3} ft³.`,
    });
    return undefined;
  }
  return n;
}

function requireLengthUnit(
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

function requireAreaUnit(
  unit: AreaUnit | undefined,
  field: string,
  errors: FieldError[],
): AreaUnit | null {
  if (!unit) {
    errors.push({ field, message: 'Unit is required.' });
    return null;
  }
  return unit;
}

function checkLinearSize(
  ft: number,
  field: string,
  label: string,
  errors: FieldError[],
  warnings: string[],
) {
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

function checkAreaSize(sqFt: number, errors: FieldError[], warnings: string[]) {
  if (sqFt > MAX_AREA_SQ_FT) {
    errors.push({ field: 'area', message: 'Area is too large to calculate safely.' });
    return;
  }
  if (sqFt > LARGE_AREA_WARNING_SQ_FT) {
    warnings.push(
      `Area is unusually large (${sqFt.toFixed(0)} sq ft). Double-check your units and measurements.`,
    );
  }
}

function checkDepthSoftWarning(depthFt: number, warnings: string[]) {
  const depthIn = depthFt * 12;
  if (depthIn < SOFT_DEPTH_LOW_IN || depthIn > SOFT_DEPTH_HIGH_IN) {
    warnings.push(
      'Many extension sources discuss roughly 2–4 inches for landscape beds and trees, but appropriate depth varies by situation.',
    );
  }
}

export function rectangularVolumeFt3(lengthFt: number, widthFt: number, depthFt: number): number {
  return lengthFt * widthFt * depthFt;
}

export function cylindricalVolumeFt3(diameterFt: number, depthFt: number): number {
  const radius = diameterFt / 2;
  return Math.PI * radius * radius * depthFt;
}

export function knownAreaVolumeFt3(areaSqFt: number, depthFt: number): number {
  return areaSqFt * depthFt;
}

/** Square feet covered by one cubic yard at the given depth (feet). */
export function coverageSqFtPerCubicYard(depthFt: number): number {
  return CUBIC_FEET_PER_CUBIC_YARD / depthFt;
}

export function bagsForPurchase(
  purchaseFt3: number,
  customBagFt3?: number,
): MulchBagCount[] {
  const rows: MulchBagCount[] = MULCH_BAG_PRESETS.map((bag) => ({
    label: bag.label,
    volumeFt3: bag.volumeFt3,
    bags: Math.ceil(purchaseFt3 / bag.volumeFt3),
  }));
  if (customBagFt3 !== undefined) {
    rows.push({
      label: formatCustomBagLabel(customBagFt3),
      volumeFt3: customBagFt3,
      bags: Math.ceil(purchaseFt3 / customBagFt3),
      isCustom: true,
    });
  }
  return rows;
}

export function formatCustomBagLabel(volumeFt3: number): string {
  const rounded = Number(volumeFt3.toPrecision(6));
  const label = Number.isInteger(rounded) ? `${rounded}.0` : String(rounded);
  return `Custom ${label} cu ft`;
}

/** Format helpers for display (do not use inside math). */
export function formatYd3(value: number): string {
  if (Math.abs(value) > 0 && Math.abs(value) < 0.005) {
    return value.toFixed(3);
  }
  return value.toFixed(2);
}

export function formatFt3(value: number): string {
  if (Math.abs(value) > 0 && Math.abs(value) < 0.005) {
    return value.toFixed(3);
  }
  return value.toFixed(2);
}

export function formatM3(value: number): string {
  return value.toFixed(3);
}

export function formatCoverage(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(1);
}

export function calculateMulch(input: MulchInput): MulchCalcResult {
  const errors: FieldError[] = [];
  const warnings: string[] = [];

  if (input.mode !== 'rectangle' && input.mode !== 'circle' && input.mode !== 'area') {
    errors.push({ field: 'mode', message: 'Select a project type.' });
    return { ok: false, errors };
  }

  const extraPercent = parseExtraPercent(input.extraPercent, errors);
  const customBagFt3 = parseOptionalCustomBag(input.customBagFt3, errors);
  if (extraPercent === null || errors.length) {
    return { ok: false, errors };
  }

  let rawFt3 = 0;
  let areaSqFt = 0;
  let depthFt = 0;
  const dimensionsFt: MulchResult['dimensionsFt'] = {};

  if (input.mode === 'rectangle') {
    const length = parseRequiredPositive(input.length, 'length', 'Length', errors);
    const width = parseRequiredPositive(input.width, 'width', 'Width', errors);
    const depth = parseRequiredPositive(input.depth, 'depth', 'Depth', errors);
    const lengthUnit = requireLengthUnit(input.lengthUnit, 'lengthUnit', errors);
    const widthUnit = requireLengthUnit(input.widthUnit, 'widthUnit', errors);
    const depthUnit = requireLengthUnit(input.depthUnit, 'depthUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (
      length === null ||
      width === null ||
      depth === null ||
      !lengthUnit ||
      !widthUnit ||
      !depthUnit
    ) {
      return { ok: false, errors };
    }

    const lengthFt = toFeet(length, lengthUnit);
    const widthFt = toFeet(width, widthUnit);
    depthFt = toFeet(depth, depthUnit);
    checkLinearSize(lengthFt, 'length', 'Length', errors, warnings);
    checkLinearSize(widthFt, 'width', 'Width', errors, warnings);
    checkLinearSize(depthFt, 'depth', 'Depth', errors, warnings);
    if (errors.length) return { ok: false, errors };

    checkDepthSoftWarning(depthFt, warnings);
    areaSqFt = lengthFt * widthFt;
    rawFt3 = rectangularVolumeFt3(lengthFt, widthFt, depthFt);
    dimensionsFt.lengthFt = lengthFt;
    dimensionsFt.widthFt = widthFt;
    dimensionsFt.depthFt = depthFt;
    dimensionsFt.areaSqFt = areaSqFt;
  } else if (input.mode === 'circle') {
    const diameter = parseRequiredPositive(input.diameter, 'diameter', 'Diameter', errors);
    const depth = parseRequiredPositive(input.depth, 'depth', 'Depth', errors);
    const diameterUnit = requireLengthUnit(input.diameterUnit, 'diameterUnit', errors);
    const depthUnit = requireLengthUnit(input.depthUnit, 'depthUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (diameter === null || depth === null || !diameterUnit || !depthUnit) {
      return { ok: false, errors };
    }

    const diameterFt = toFeet(diameter, diameterUnit);
    depthFt = toFeet(depth, depthUnit);
    checkLinearSize(diameterFt, 'diameter', 'Diameter', errors, warnings);
    checkLinearSize(depthFt, 'depth', 'Depth', errors, warnings);
    if (errors.length) return { ok: false, errors };

    checkDepthSoftWarning(depthFt, warnings);
    const radius = diameterFt / 2;
    areaSqFt = Math.PI * radius * radius;
    rawFt3 = cylindricalVolumeFt3(diameterFt, depthFt);
    dimensionsFt.diameterFt = diameterFt;
    dimensionsFt.depthFt = depthFt;
    dimensionsFt.areaSqFt = areaSqFt;
  } else {
    const area = parseRequiredPositive(input.area, 'area', 'Area', errors);
    const depth = parseRequiredPositive(input.depth, 'depth', 'Depth', errors);
    const areaUnit = requireAreaUnit(input.areaUnit, 'areaUnit', errors);
    const depthUnit = requireLengthUnit(input.depthUnit, 'depthUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (area === null || depth === null || !areaUnit || !depthUnit) {
      return { ok: false, errors };
    }

    areaSqFt = toSquareFeet(area, areaUnit);
    depthFt = toFeet(depth, depthUnit);
    checkAreaSize(areaSqFt, errors, warnings);
    checkLinearSize(depthFt, 'depth', 'Depth', errors, warnings);
    if (errors.length) return { ok: false, errors };

    checkDepthSoftWarning(depthFt, warnings);
    rawFt3 = knownAreaVolumeFt3(areaSqFt, depthFt);
    dimensionsFt.areaSqFt = areaSqFt;
    dimensionsFt.depthFt = depthFt;
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

  const coverage = coverageSqFtPerCubicYard(depthFt);
  if (!Number.isFinite(coverage) || coverage <= 0) {
    return {
      ok: false,
      errors: [{ field: 'depth', message: 'Could not calculate coverage from this depth.' }],
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
      bags: bagsForPurchase(purchaseFt3, customBagFt3),
      areaSqFt,
      depthFt,
      depthIn: depthFt * 12,
      coverageSqFtPerYd3: coverage,
      warnings,
      dimensionsFt,
    },
  };
}
