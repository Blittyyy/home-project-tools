/**
 * Paint Calculator — pure calculation + validation.
 * Internal area base: square feet. Paint volume: US gallons.
 */
import { type LengthUnit, toFeet } from './length-units.ts';
import { type AreaUnit, toSquareFeet } from './area-units.ts';

export type PaintMode = 'room' | 'walls' | 'area';
export type OpeningMethod = 'counts' | 'custom';

export type FieldError = { field: string; message: string };

export type PaintCalcResult =
  | { ok: true; result: PaintResult }
  | { ok: false; errors: FieldError[] };

/** Exact: 1 US liquid gallon = 3.785411784 L */
export const LITERS_PER_US_GALLON = 3.785411784;

/** Benjamin Moore estimating allowances (approximate). */
export const DOOR_OPENING_SQ_FT = 20;
export const WINDOW_OPENING_SQ_FT = 15;

export const DEFAULT_COVERAGE_SQ_FT_PER_GAL = 350;
export const DEFAULT_COATS = 2;
export const MIN_COATS = 1;
export const MAX_COATS = 10;

export const MIN_COVERAGE_SQ_FT_PER_GAL = 50;
export const MAX_COVERAGE_SQ_FT_PER_GAL = 800;
/** Soft informational band; still calculates inside hard bounds. */
export const SOFT_LOW_COVERAGE_SQ_FT_PER_GAL = 200;
export const SOFT_HIGH_COVERAGE_SQ_FT_PER_GAL = 500;

export const MIN_WALLS = 1;
export const MAX_WALLS = 20;

export const LARGE_DIMENSION_WARNING_FT = 200;
export const LARGE_AREA_WARNING_SQ_FT = 40_000;
export const MAX_LINEAR_FT = 100_000;
export const MAX_AREA_SQ_FT = 1_000_000_000;

export interface PaintWallInput {
  width?: number;
  widthUnit?: LengthUnit;
  height?: number;
  heightUnit?: LengthUnit;
}

export interface PaintInput {
  mode: PaintMode;
  wallCoats: number;
  wallCoverageSqFtPerGal: number;
  /** Room mode only. */
  length?: number;
  lengthUnit?: LengthUnit;
  width?: number;
  widthUnit?: LengthUnit;
  height?: number;
  heightUnit?: LengthUnit;
  subtractOpenings?: boolean;
  openingMethod?: OpeningMethod;
  doorCount?: number;
  windowCount?: number;
  customOpeningArea?: number;
  customOpeningUnit?: AreaUnit;
  includeCeiling?: boolean;
  ceilingCoats?: number;
  ceilingCoverageSqFtPerGal?: number;
  /** Walls mode. */
  walls?: PaintWallInput[];
  /** Known area mode. */
  area?: number;
  areaUnit?: AreaUnit;
}

export interface PaintLineResult {
  areaSqFt: number;
  coats: number;
  coverageSqFtPerGal: number;
  coatedAreaSqFt: number;
  calculatedGallons: number;
  purchaseGallons: number;
  calculatedLiters: number;
}

export interface PaintResult {
  mode: PaintMode;
  grossWallSqFt: number;
  openingSqFt: number;
  paintableWallSqFt: number;
  wallCount?: number;
  openingsEnabled: boolean;
  openingMethod?: OpeningMethod;
  doorCount?: number;
  windowCount?: number;
  walls: PaintLineResult;
  ceiling: PaintLineResult | null;
  warnings: string[];
  dimensionsFt: {
    lengthFt?: number;
    widthFt?: number;
    heightFt?: number;
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

function parseIntegerInRange(
  value: unknown,
  field: string,
  label: string,
  min: number,
  max: number,
  errors: FieldError[],
): number | null {
  if (value === undefined || value === null || value === '') {
    errors.push({ field, message: `${label} is required.` });
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFiniteNumber(n) || !Number.isInteger(n)) {
    errors.push({ field, message: `${label} must be a whole number.` });
    return null;
  }
  if (n < min || n > max) {
    errors.push({ field, message: `${label} must be between ${min} and ${max}.` });
    return null;
  }
  return n;
}

function parseNonNegativeInteger(
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
  if (!isFiniteNumber(n) || !Number.isInteger(n)) {
    errors.push({ field, message: `${label} must be a whole number.` });
    return null;
  }
  if (n < 0) {
    errors.push({ field, message: `${label} cannot be negative.` });
    return null;
  }
  return n;
}

function parseCoverage(
  value: unknown,
  field: string,
  label: string,
  errors: FieldError[],
  warnings: string[],
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
  if (n < MIN_COVERAGE_SQ_FT_PER_GAL || n > MAX_COVERAGE_SQ_FT_PER_GAL) {
    errors.push({
      field,
      message: `${label} must be between ${MIN_COVERAGE_SQ_FT_PER_GAL} and ${MAX_COVERAGE_SQ_FT_PER_GAL} sq ft/gal.`,
    });
    return null;
  }
  if (n < SOFT_LOW_COVERAGE_SQ_FT_PER_GAL || n > SOFT_HIGH_COVERAGE_SQ_FT_PER_GAL) {
    warnings.push(
      `${label} of ${formatCoverage(n)} sq ft/gal is unusual for typical interior latex. Confirm your product label.`,
    );
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

function checkAreaSize(sqFt: number, field: string, errors: FieldError[], warnings: string[]) {
  if (sqFt > MAX_AREA_SQ_FT) {
    errors.push({ field, message: 'Area is too large to calculate safely.' });
    return;
  }
  if (sqFt > LARGE_AREA_WARNING_SQ_FT) {
    warnings.push(
      `Area is unusually large (${sqFt.toFixed(0)} sq ft). Double-check your units and measurements.`,
    );
  }
}

export function roomGrossWallAreaSqFt(lengthFt: number, widthFt: number, heightFt: number): number {
  return 2 * (lengthFt + widthFt) * heightFt;
}

export function wallAreaSqFt(widthFt: number, heightFt: number): number {
  return widthFt * heightFt;
}

export function sumWallAreasSqFt(walls: { widthFt: number; heightFt: number }[]): number {
  return walls.reduce((sum, wall) => sum + wallAreaSqFt(wall.widthFt, wall.heightFt), 0);
}

export function openingAreaFromCounts(doorCount: number, windowCount: number): number {
  return doorCount * DOOR_OPENING_SQ_FT + windowCount * WINDOW_OPENING_SQ_FT;
}

export function usGallonsToLiters(gallons: number): number {
  return gallons * LITERS_PER_US_GALLON;
}

export function paintLineFromArea(
  areaSqFt: number,
  coats: number,
  coverageSqFtPerGal: number,
): PaintLineResult {
  const coatedAreaSqFt = areaSqFt * coats;
  const calculatedGallons = coatedAreaSqFt / coverageSqFtPerGal;
  const purchaseGallons = Math.ceil(calculatedGallons);
  return {
    areaSqFt,
    coats,
    coverageSqFtPerGal,
    coatedAreaSqFt,
    calculatedGallons,
    purchaseGallons,
    calculatedLiters: usGallonsToLiters(calculatedGallons),
  };
}

export function formatGallons(value: number): string {
  if (Math.abs(value) > 0 && Math.abs(value) < 0.005) return value.toFixed(3);
  return value.toFixed(2);
}

export function formatLiters(value: number): string {
  return value.toFixed(2);
}

export function formatArea(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(1);
}

export function formatCoverage(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(1);
}

export function calculatePaint(input: PaintInput): PaintCalcResult {
  const errors: FieldError[] = [];
  const warnings: string[] = [];

  if (input.mode !== 'room' && input.mode !== 'walls' && input.mode !== 'area') {
    errors.push({ field: 'mode', message: 'Select a project type.' });
    return { ok: false, errors };
  }

  const wallCoats = parseIntegerInRange(
    input.wallCoats,
    'wallCoats',
    'Number of coats',
    MIN_COATS,
    MAX_COATS,
    errors,
  );
  const wallCoverage = parseCoverage(
    input.wallCoverageSqFtPerGal,
    'wallCoverageSqFtPerGal',
    'Coverage per gallon',
    errors,
    warnings,
  );

  if (wallCoats === null || wallCoverage === null || errors.length) {
    return { ok: false, errors };
  }

  let grossWallSqFt = 0;
  let wallCount: number | undefined;
  const dimensionsFt: PaintResult['dimensionsFt'] = {};

  if (input.mode === 'room') {
    const length = parseRequiredPositive(input.length, 'length', 'Room length', errors);
    const width = parseRequiredPositive(input.width, 'width', 'Room width', errors);
    const height = parseRequiredPositive(input.height, 'height', 'Wall height', errors);
    const lengthUnit = requireLengthUnit(input.lengthUnit, 'lengthUnit', errors);
    const widthUnit = requireLengthUnit(input.widthUnit, 'widthUnit', errors);
    const heightUnit = requireLengthUnit(input.heightUnit, 'heightUnit', errors);

    if (errors.length) return { ok: false, errors };
    if (
      length === null ||
      width === null ||
      height === null ||
      !lengthUnit ||
      !widthUnit ||
      !heightUnit
    ) {
      return { ok: false, errors };
    }

    const lengthFt = toFeet(length, lengthUnit);
    const widthFt = toFeet(width, widthUnit);
    const heightFt = toFeet(height, heightUnit);
    checkLinearSize(lengthFt, 'length', 'Room length', errors, warnings);
    checkLinearSize(widthFt, 'width', 'Room width', errors, warnings);
    checkLinearSize(heightFt, 'height', 'Wall height', errors, warnings);
    if (errors.length) return { ok: false, errors };

    grossWallSqFt = roomGrossWallAreaSqFt(lengthFt, widthFt, heightFt);
    checkAreaSize(grossWallSqFt, 'length', errors, warnings);
    if (errors.length) return { ok: false, errors };

    dimensionsFt.lengthFt = lengthFt;
    dimensionsFt.widthFt = widthFt;
    dimensionsFt.heightFt = heightFt;
  } else if (input.mode === 'walls') {
    const walls = input.walls ?? [];
    if (walls.length < MIN_WALLS) {
      errors.push({ field: 'walls', message: 'Add at least one wall.' });
      return { ok: false, errors };
    }
    if (walls.length > MAX_WALLS) {
      errors.push({
        field: 'walls',
        message: `You can enter at most ${MAX_WALLS} walls.`,
      });
      return { ok: false, errors };
    }

    const normalized: { widthFt: number; heightFt: number }[] = [];
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i]!;
      const idx = i + 1;
      const width = parseRequiredPositive(wall.width, `wall${idx}Width`, `Wall ${idx} width`, errors);
      const height = parseRequiredPositive(
        wall.height,
        `wall${idx}Height`,
        `Wall ${idx} height`,
        errors,
      );
      const widthUnit = requireLengthUnit(wall.widthUnit, `wall${idx}WidthUnit`, errors);
      const heightUnit = requireLengthUnit(wall.heightUnit, `wall${idx}HeightUnit`, errors);
      if (width === null || height === null || !widthUnit || !heightUnit) continue;

      const widthFt = toFeet(width, widthUnit);
      const heightFt = toFeet(height, heightUnit);
      checkLinearSize(widthFt, `wall${idx}Width`, `Wall ${idx} width`, errors, warnings);
      checkLinearSize(heightFt, `wall${idx}Height`, `Wall ${idx} height`, errors, warnings);
      normalized.push({ widthFt, heightFt });
    }

    if (errors.length) return { ok: false, errors };

    grossWallSqFt = sumWallAreasSqFt(normalized);
    checkAreaSize(grossWallSqFt, 'walls', errors, warnings);
    if (errors.length) return { ok: false, errors };

    wallCount = normalized.length;
    dimensionsFt.areaSqFt = grossWallSqFt;
  } else {
    const area = parseRequiredPositive(input.area, 'area', 'Paintable area', errors);
    const areaUnit = requireAreaUnit(input.areaUnit, 'areaUnit', errors);
    if (errors.length) return { ok: false, errors };
    if (area === null || !areaUnit) return { ok: false, errors };

    grossWallSqFt = toSquareFeet(area, areaUnit);
    checkAreaSize(grossWallSqFt, 'area', errors, warnings);
    if (errors.length) return { ok: false, errors };

    dimensionsFt.areaSqFt = grossWallSqFt;
  }

  let openingSqFt = 0;
  let openingsEnabled = false;
  let openingMethod: OpeningMethod | undefined;
  let doorCount: number | undefined;
  let windowCount: number | undefined;

  if (input.mode === 'room' && input.subtractOpenings) {
    openingsEnabled = true;
    const method: OpeningMethod = input.openingMethod === 'custom' ? 'custom' : 'counts';
    openingMethod = method;

    if (method === 'counts') {
      const doors = parseNonNegativeInteger(input.doorCount, 'doorCount', 'Number of doors', errors);
      const windows = parseNonNegativeInteger(
        input.windowCount,
        'windowCount',
        'Number of windows',
        errors,
      );
      if (doors !== null && windows !== null) {
        doorCount = doors;
        windowCount = windows;
        openingSqFt = openingAreaFromCounts(doors, windows);
      }
    } else if (
      input.customOpeningArea === undefined ||
      input.customOpeningArea === null ||
      (input.customOpeningArea as unknown) === ''
    ) {
      errors.push({ field: 'customOpeningArea', message: 'Opening area is required.' });
    } else {
      const n =
        typeof input.customOpeningArea === 'number'
          ? input.customOpeningArea
          : Number(input.customOpeningArea);
      if (!isFiniteNumber(n)) {
        errors.push({ field: 'customOpeningArea', message: 'Opening area must be a valid number.' });
      } else if (n < 0) {
        errors.push({ field: 'customOpeningArea', message: 'Opening area cannot be negative.' });
      } else {
        const unit = requireAreaUnit(input.customOpeningUnit, 'customOpeningUnit', errors);
        if (unit) openingSqFt = toSquareFeet(n, unit);
      }
    }

    if (errors.length) return { ok: false, errors };

    if (openingSqFt >= grossWallSqFt) {
      errors.push({
        field: openingMethod === 'custom' ? 'customOpeningArea' : 'doorCount',
        message: 'Opening area must be less than the gross wall area.',
      });
      return { ok: false, errors };
    }
  }

  const paintableWallSqFt = grossWallSqFt - openingSqFt;
  if (!Number.isFinite(paintableWallSqFt) || paintableWallSqFt <= 0) {
    return {
      ok: false,
      errors: [{ field: 'mode', message: 'Could not calculate a valid paintable wall area.' }],
    };
  }

  const walls = paintLineFromArea(paintableWallSqFt, wallCoats, wallCoverage);
  if (!Number.isFinite(walls.calculatedGallons)) {
    return {
      ok: false,
      errors: [{ field: 'mode', message: 'Could not calculate a valid paint quantity.' }],
    };
  }

  let ceiling: PaintLineResult | null = null;
  if (input.mode === 'room' && input.includeCeiling) {
    const lengthFt = dimensionsFt.lengthFt;
    const widthFt = dimensionsFt.widthFt;
    if (lengthFt === undefined || widthFt === undefined) {
      return {
        ok: false,
        errors: [{ field: 'length', message: 'Room dimensions are required for ceiling paint.' }],
      };
    }

    const ceilingCoats = parseIntegerInRange(
      input.ceilingCoats ?? DEFAULT_COATS,
      'ceilingCoats',
      'Ceiling coats',
      MIN_COATS,
      MAX_COATS,
      errors,
    );
    const ceilingCoverage = parseCoverage(
      input.ceilingCoverageSqFtPerGal ?? DEFAULT_COVERAGE_SQ_FT_PER_GAL,
      'ceilingCoverageSqFtPerGal',
      'Ceiling coverage per gallon',
      errors,
      warnings,
    );
    if (ceilingCoats === null || ceilingCoverage === null || errors.length) {
      return { ok: false, errors };
    }

    const ceilingArea = lengthFt * widthFt;
    ceiling = paintLineFromArea(ceilingArea, ceilingCoats, ceilingCoverage);
  }

  return {
    ok: true,
    result: {
      mode: input.mode,
      grossWallSqFt,
      openingSqFt,
      paintableWallSqFt,
      wallCount,
      openingsEnabled,
      openingMethod,
      doorCount,
      windowCount,
      walls,
      ceiling,
      warnings,
      dimensionsFt,
    },
  };
}
