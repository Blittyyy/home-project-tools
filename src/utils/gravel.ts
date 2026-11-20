/**
 * Gravel Calculator — pure calculation + validation.
 * Internal volume base: cubic feet. Density affects weight only.
 */
import {
  type LengthUnit,
  cubicFeetToCubicMeters,
  cubicFeetToCubicYards,
  toFeet,
} from './length-units.ts';
import { type AreaUnit, toSquareFeet } from './area-units.ts';
import { applyExtraMaterial } from './extra-material.ts';

export type GravelMode = 'rectangle' | 'circle' | 'area';

export type GravelMaterialId = 'crushed_stone' | 'gravel_dry_quarter_to_2' | 'custom';

export type FieldError = { field: string; message: string };

export type GravelCalcResult =
  | { ok: true; result: GravelResult }
  | { ok: false; errors: FieldError[] };

/** Caterpillar loose crushed stone: 2,700 lb/yd³ → 100 lb/ft³. */
export const CRUSHED_STONE_LB_PER_FT3 = 100;

/** Caterpillar loose dry gravel ¼–2 in: 2,850 lb/yd³. */
export const DRY_GRAVEL_LB_PER_YD3 = 2850;
export const DRY_GRAVEL_LB_PER_FT3 = DRY_GRAVEL_LB_PER_YD3 / 27;

export const LB_PER_US_TON = 2000;
/** Exact international avoirdupois conversion commonly used for metric tonnes. */
export const LB_PER_METRIC_TONNE = 2204.6226218;

export const GRAVEL_EXTRA_PRESETS = [0, 5, 10] as const;
export const DEFAULT_EXTRA_PERCENT = 10;
export const MAX_CUSTOM_EXTRA_PERCENT = 25;

export const MIN_DENSITY_LB_PER_FT3 = 40;
export const MAX_DENSITY_LB_PER_FT3 = 160;
export const SOFT_LOW_DENSITY_LB_PER_FT3 = 70;
export const SOFT_HIGH_DENSITY_LB_PER_FT3 = 130;

/** Soft warning threshold (feet). Still calculates. */
export const LARGE_DIMENSION_WARNING_FT = 200;
/** Soft warning threshold (sq ft). Still calculates. */
export const LARGE_AREA_WARNING_SQ_FT = 40_000;

/** Hard reject absurd linear sizes (feet). */
export const MAX_LINEAR_FT = 100_000;
/** Hard reject absurd area (sq ft). */
export const MAX_AREA_SQ_FT = 1_000_000_000;

export interface GravelMaterialPreset {
  id: Exclude<GravelMaterialId, 'custom'>;
  label: string;
  densityLbPerFt3: number;
  sourceNote: string;
}

export const GRAVEL_MATERIAL_PRESETS: readonly GravelMaterialPreset[] = [
  {
    id: 'crushed_stone',
    label: 'Crushed stone (loose, planning)',
    densityLbPerFt3: CRUSHED_STONE_LB_PER_FT3,
    sourceNote: 'Caterpillar loose crushed stone = 2,700 lb/yd³',
  },
  {
    id: 'gravel_dry_quarter_to_2',
    label: 'Dry gravel, ¼–2 in (loose)',
    densityLbPerFt3: DRY_GRAVEL_LB_PER_FT3,
    sourceNote: 'Caterpillar loose dry gravel ¼–2 in = 2,850 lb/yd³',
  },
] as const;

export interface GravelInput {
  mode: GravelMode;
  extraPercent: number;
  materialId: GravelMaterialId;
  /** Required when materialId is custom; ignored for presets (preset density is used). */
  densityLbPerFt3?: number;
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

export interface GravelResult {
  mode: GravelMode;
  materialId: GravelMaterialId;
  materialLabel: string;
  densityLbPerFt3: number;
  tonsPerYd3: number;
  extraPercent: number;
  rawFt3: number;
  purchaseFt3: number;
  rawYd3: number;
  purchaseYd3: number;
  rawM3: number;
  purchaseM3: number;
  extraFt3: number;
  extraYd3: number;
  rawLb: number;
  purchaseLb: number;
  rawTons: number;
  purchaseTons: number;
  rawTonnes: number;
  purchaseTonnes: number;
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

export function densityForMaterial(
  materialId: GravelMaterialId,
  customDensity?: number,
): { densityLbPerFt3: number; label: string } | { error: FieldError } {
  if (materialId === 'crushed_stone') {
    return {
      densityLbPerFt3: CRUSHED_STONE_LB_PER_FT3,
      label: GRAVEL_MATERIAL_PRESETS[0].label,
    };
  }
  if (materialId === 'gravel_dry_quarter_to_2') {
    return {
      densityLbPerFt3: DRY_GRAVEL_LB_PER_FT3,
      label: GRAVEL_MATERIAL_PRESETS[1].label,
    };
  }
  if (materialId === 'custom') {
    if (customDensity === undefined || customDensity === null || (customDensity as unknown) === '') {
      return {
        error: { field: 'densityLbPerFt3', message: 'Custom density is required.' },
      };
    }
    if (!isFiniteNumber(customDensity)) {
      return {
        error: { field: 'densityLbPerFt3', message: 'Custom density must be a valid number.' },
      };
    }
    if (customDensity < MIN_DENSITY_LB_PER_FT3 || customDensity > MAX_DENSITY_LB_PER_FT3) {
      return {
        error: {
          field: 'densityLbPerFt3',
          message: `Density must be between ${MIN_DENSITY_LB_PER_FT3} and ${MAX_DENSITY_LB_PER_FT3} lb/ft³.`,
        },
      };
    }
    return { densityLbPerFt3: customDensity, label: 'Custom density' };
  }
  return { error: { field: 'materialId', message: 'Select a material.' } };
}

export function weightFromVolumeFt3(
  volumeFt3: number,
  densityLbPerFt3: number,
): { lb: number; tons: number; tonnes: number } {
  const lb = volumeFt3 * densityLbPerFt3;
  return {
    lb,
    tons: lb / LB_PER_US_TON,
    tonnes: lb / LB_PER_METRIC_TONNE,
  };
}

export function tonsPerCubicYard(densityLbPerFt3: number): number {
  return (densityLbPerFt3 * 27) / LB_PER_US_TON;
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

export function formatTons(value: number): string {
  return value.toFixed(1);
}

export function formatDensity(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(1);
}

export function calculateGravel(input: GravelInput): GravelCalcResult {
  const errors: FieldError[] = [];
  const warnings: string[] = [];

  if (input.mode !== 'rectangle' && input.mode !== 'circle' && input.mode !== 'area') {
    errors.push({ field: 'mode', message: 'Select a project type.' });
    return { ok: false, errors };
  }

  if (
    input.materialId !== 'crushed_stone' &&
    input.materialId !== 'gravel_dry_quarter_to_2' &&
    input.materialId !== 'custom'
  ) {
    errors.push({ field: 'materialId', message: 'Select a material.' });
    return { ok: false, errors };
  }

  const extraPercent = parseExtraPercent(input.extraPercent, errors);
  const densityResult = densityForMaterial(input.materialId, input.densityLbPerFt3);
  if ('error' in densityResult) {
    errors.push(densityResult.error);
  }
  if (extraPercent === null || errors.length) {
    return { ok: false, errors };
  }
  if ('error' in densityResult) {
    return { ok: false, errors };
  }

  const { densityLbPerFt3, label: materialLabel } = densityResult;
  if (
    densityLbPerFt3 < SOFT_LOW_DENSITY_LB_PER_FT3 ||
    densityLbPerFt3 > SOFT_HIGH_DENSITY_LB_PER_FT3
  ) {
    warnings.push(
      `Density ${formatDensity(densityLbPerFt3)} lb/ft³ is outside the typical planning range (${SOFT_LOW_DENSITY_LB_PER_FT3}–${SOFT_HIGH_DENSITY_LB_PER_FT3} lb/ft³). Double-check with your supplier.`,
    );
  }

  let rawFt3 = 0;
  const dimensionsFt: GravelResult['dimensionsFt'] = {};

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
    const depthFt = toFeet(depth, depthUnit);
    checkLinearSize(lengthFt, 'length', 'Length', errors, warnings);
    checkLinearSize(widthFt, 'width', 'Width', errors, warnings);
    checkLinearSize(depthFt, 'depth', 'Depth', errors, warnings);
    if (errors.length) return { ok: false, errors };

    rawFt3 = rectangularVolumeFt3(lengthFt, widthFt, depthFt);
    dimensionsFt.lengthFt = lengthFt;
    dimensionsFt.widthFt = widthFt;
    dimensionsFt.depthFt = depthFt;
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
    const depthFt = toFeet(depth, depthUnit);
    checkLinearSize(diameterFt, 'diameter', 'Diameter', errors, warnings);
    checkLinearSize(depthFt, 'depth', 'Depth', errors, warnings);
    if (errors.length) return { ok: false, errors };

    rawFt3 = cylindricalVolumeFt3(diameterFt, depthFt);
    dimensionsFt.diameterFt = diameterFt;
    dimensionsFt.depthFt = depthFt;
  } else {
    const area = parseRequiredPositive(input.area, 'area', 'Area', errors);
    const depth = parseRequiredPositive(input.depth, 'depth', 'Depth', errors);
    const areaUnit = requireAreaUnit(input.areaUnit, 'areaUnit', errors);
    const depthUnit = requireLengthUnit(input.depthUnit, 'depthUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (area === null || depth === null || !areaUnit || !depthUnit) {
      return { ok: false, errors };
    }

    const areaSqFt = toSquareFeet(area, areaUnit);
    const depthFt = toFeet(depth, depthUnit);
    checkAreaSize(areaSqFt, errors, warnings);
    checkLinearSize(depthFt, 'depth', 'Depth', errors, warnings);
    if (errors.length) return { ok: false, errors };

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

  const rawWeight = weightFromVolumeFt3(rawFt3, densityLbPerFt3);
  const purchaseWeight = weightFromVolumeFt3(purchaseFt3, densityLbPerFt3);

  return {
    ok: true,
    result: {
      mode: input.mode,
      materialId: input.materialId,
      materialLabel,
      densityLbPerFt3,
      tonsPerYd3: tonsPerCubicYard(densityLbPerFt3),
      extraPercent,
      rawFt3,
      purchaseFt3,
      rawYd3: cubicFeetToCubicYards(rawFt3),
      purchaseYd3: cubicFeetToCubicYards(purchaseFt3),
      rawM3: cubicFeetToCubicMeters(rawFt3),
      purchaseM3: cubicFeetToCubicMeters(purchaseFt3),
      extraFt3,
      extraYd3: cubicFeetToCubicYards(extraFt3),
      rawLb: rawWeight.lb,
      purchaseLb: purchaseWeight.lb,
      rawTons: rawWeight.tons,
      purchaseTons: purchaseWeight.tons,
      rawTonnes: rawWeight.tonnes,
      purchaseTonnes: purchaseWeight.tonnes,
      warnings,
      dimensionsFt,
    },
  };
}
