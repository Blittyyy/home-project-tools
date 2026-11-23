/**
 * Tile Calculator — pure calculation + validation.
 * Internal area base: square feet. Tile face area uses face dimensions only (no grout gap).
 */
import { type LengthUnit, toFeet, METERS_PER_FOOT } from './length-units.ts';
import { type AreaUnit, toSquareFeet, fromSquareFeet, SQUARE_FEET_PER_SQUARE_METER } from './area-units.ts';

export type TileMode = 'rectangle' | 'area';
export type TileSizeUnit = 'in' | 'cm';
export type TileLayout = 'straight' | 'diagonal' | 'custom';
export type TilePackingMethod = 'tiles_per_box' | 'coverage_per_box';

export type FieldError = { field: string; message: string };

export type TileCalcResult =
  | { ok: true; result: TileResult }
  | { ok: false; errors: FieldError[] };

/** Numerical epsilon before Math.ceil to avoid float artifacts (e.g. 110.00000000001 → 111). */
export const CEIL_EPSILON = 1e-9;

export const DEFAULT_WASTE_PERCENT_STRAIGHT = 10;
export const DEFAULT_WASTE_PERCENT_DIAGONAL = 15;
export const MAX_WASTE_PERCENT = 50;

/** Soft warning threshold (sq ft). Still calculates. */
export const LARGE_AREA_WARNING_SQ_FT = 40_000;
/** Soft warning threshold for a single linear dimension (feet). */
export const LARGE_DIMENSION_WARNING_FT = 200;
/** Hard reject absurd linear sizes (feet). */
export const MAX_LINEAR_FT = 100_000;
/** Hard reject absurd area (sq ft). */
export const MAX_AREA_SQ_FT = 1_000_000_000;

export interface TileInput {
  mode: TileMode;
  layout: TileLayout;
  wastePercent: number;
  /** Tile width in the selected tile unit. */
  tileWidth: number;
  tileLength: number;
  tileUnit: TileSizeUnit;
  length?: number;
  lengthUnit?: LengthUnit;
  width?: number;
  widthUnit?: LengthUnit;
  area?: number;
  areaUnit?: AreaUnit;
  /** When true, packingMethod + related field are required. */
  calculateBoxes?: boolean;
  packingMethod?: TilePackingMethod;
  tilesPerBox?: number;
  coveragePerBox?: number;
  coveragePerBoxUnit?: AreaUnit;
}

export interface TileResult {
  mode: TileMode;
  layout: TileLayout;
  wastePercent: number;
  projectAreaSqFt: number;
  projectAreaM2: number;
  tileFaceAreaSqFt: number;
  tileWidthDisplay: number;
  tileLengthDisplay: number;
  tileUnit: TileSizeUnit;
  rawExactTiles: number;
  rawWholeTiles: number;
  plannedAreaWithWasteSqFt: number;
  tilesToBuy: number;
  extraTiles: number;
  purchaseFaceAreaSqFt: number;
  purchaseFaceAreaM2: number;
  calculateBoxes: boolean;
  packingMethod?: TilePackingMethod;
  tilesPerBox?: number;
  coveragePerBoxSqFt?: number;
  boxes?: number;
  warnings: string[];
  dimensionsFt: {
    lengthFt?: number;
    widthFt?: number;
    areaSqFt?: number;
  };
}

/** Safe ceiling that absorbs tiny floating-point overshoot. */
export function safeCeil(value: number, epsilon: number = CEIL_EPSILON): number {
  if (!Number.isFinite(value)) return NaN;
  return Math.ceil(value - epsilon);
}

export function layoutSuggestedWaste(layout: TileLayout): number {
  if (layout === 'diagonal') return DEFAULT_WASTE_PERCENT_DIAGONAL;
  if (layout === 'straight') return DEFAULT_WASTE_PERCENT_STRAIGHT;
  return DEFAULT_WASTE_PERCENT_STRAIGHT;
}

/**
 * Tile face area in square feet from width × length in inches or centimeters.
 * No grout gap. No internal rounding.
 */
export function tileFaceAreaSqFt(
  tileWidth: number,
  tileLength: number,
  unit: TileSizeUnit,
): number {
  if (unit === 'in') {
    return (tileWidth * tileLength) / 144;
  }
  // centimeters → feet via exact SI foot, then multiply
  const wFt = toFeet(tileWidth, 'cm');
  const lFt = toFeet(tileLength, 'cm');
  return wFt * lFt;
}

export function formatArea(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3).replace(/\.?0+$/, '') || '0';
}

export function formatTileSize(width: number, length: number, unit: TileSizeUnit): string {
  const u = unit === 'in' ? 'in' : 'cm';
  const fmt = (n: number) =>
    Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(n);
  return `${fmt(width)} × ${fmt(length)} ${u}`;
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

function parseWastePercent(value: unknown, errors: FieldError[]): number | null {
  if (value === undefined || value === null || value === '') {
    errors.push({ field: 'wastePercent', message: 'Waste percent is required.' });
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFiniteNumber(n)) {
    errors.push({ field: 'wastePercent', message: 'Waste percent must be a valid number.' });
    return null;
  }
  if (n < 0 || n > MAX_WASTE_PERCENT) {
    errors.push({
      field: 'wastePercent',
      message: `Waste percent must be between 0 and ${MAX_WASTE_PERCENT}%.`,
    });
    return null;
  }
  return n;
}

function parsePositiveInteger(
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
  if (!Number.isInteger(n) || n <= 0) {
    errors.push({ field, message: `${label} must be a whole number greater than zero.` });
    return null;
  }
  return n;
}

export function calculateTile(input: TileInput): TileCalcResult {
  const errors: FieldError[] = [];
  const warnings: string[] = [];

  const mode = input.mode;
  if (mode !== 'rectangle' && mode !== 'area') {
    errors.push({ field: 'mode', message: 'Choose Rectangle or Known area.' });
  }

  const layout = input.layout;
  if (layout !== 'straight' && layout !== 'diagonal' && layout !== 'custom') {
    errors.push({ field: 'layout', message: 'Choose a layout option.' });
  }

  const wastePercent = parseWastePercent(input.wastePercent, errors);

  const tileUnit = input.tileUnit === 'cm' ? 'cm' : input.tileUnit === 'in' ? 'in' : null;
  if (!tileUnit) {
    errors.push({ field: 'tileUnit', message: 'Tile size unit must be inches or centimeters.' });
  }

  const tileWidth = parseRequiredPositive(input.tileWidth, 'tileWidth', 'Tile width', errors);
  const tileLength = parseRequiredPositive(input.tileLength, 'tileLength', 'Tile length', errors);

  let projectAreaSqFt: number | null = null;
  const dimensionsFt: TileResult['dimensionsFt'] = {};

  if (mode === 'rectangle') {
    const length = parseRequiredPositive(input.length, 'length', 'Length', errors);
    const width = parseRequiredPositive(input.width, 'width', 'Width', errors);
    const lengthUnit = input.lengthUnit ?? 'ft';
    const widthUnit = input.widthUnit ?? 'ft';
    if (length !== null && width !== null) {
      const lengthFt = toFeet(length, lengthUnit);
      const widthFt = toFeet(width, widthUnit);
      if (lengthFt > MAX_LINEAR_FT || widthFt > MAX_LINEAR_FT) {
        errors.push({ field: 'length', message: 'Project dimensions are too large to estimate.' });
      } else {
        projectAreaSqFt = lengthFt * widthFt;
        dimensionsFt.lengthFt = lengthFt;
        dimensionsFt.widthFt = widthFt;
        if (lengthFt >= LARGE_DIMENSION_WARNING_FT || widthFt >= LARGE_DIMENSION_WARNING_FT) {
          warnings.push(
            'One or more dimensions are unusually large. Double-check units and measurements.',
          );
        }
      }
    }
  } else if (mode === 'area') {
    const area = parseRequiredPositive(input.area, 'area', 'Area', errors);
    const areaUnit = (input.areaUnit ?? 'sq_ft') as AreaUnit;
    if (area !== null) {
      projectAreaSqFt = toSquareFeet(area, areaUnit);
      dimensionsFt.areaSqFt = projectAreaSqFt;
    }
  }

  if (projectAreaSqFt !== null) {
    if (projectAreaSqFt > MAX_AREA_SQ_FT) {
      errors.push({ field: mode === 'area' ? 'area' : 'length', message: 'Project area is too large to estimate.' });
      projectAreaSqFt = null;
    } else if (projectAreaSqFt >= LARGE_AREA_WARNING_SQ_FT) {
      warnings.push('Project area is very large. Confirm measurements before ordering materials.');
    }
  }

  let tileFace: number | null = null;
  if (tileWidth !== null && tileLength !== null && tileUnit) {
    tileFace = tileFaceAreaSqFt(tileWidth, tileLength, tileUnit);
    if (!Number.isFinite(tileFace) || tileFace <= 0) {
      errors.push({ field: 'tileWidth', message: 'Could not calculate tile face area from these dimensions.' });
      tileFace = null;
    }
  }

  // Soft: tile larger than project in one dimension (rectangle only)
  if (
    mode === 'rectangle' &&
    dimensionsFt.lengthFt !== undefined &&
    dimensionsFt.widthFt !== undefined &&
    tileWidth !== null &&
    tileLength !== null &&
    tileUnit
  ) {
    const tileWFt = tileUnit === 'in' ? tileWidth / 12 : toFeet(tileWidth, 'cm');
    const tileLFt = tileUnit === 'in' ? tileLength / 12 : toFeet(tileLength, 'cm');
    const maxTile = Math.max(tileWFt, tileLFt);
    const minProject = Math.min(dimensionsFt.lengthFt, dimensionsFt.widthFt);
    if (maxTile > minProject + 1e-9) {
      warnings.push(
        'Tile size is larger than at least one project dimension. Confirm this large-format or specialty product is intended.',
      );
    }
  }

  const calculateBoxes = Boolean(input.calculateBoxes);
  let packingMethod: TilePackingMethod | undefined;
  let tilesPerBox: number | undefined;
  let coveragePerBoxSqFt: number | undefined;
  let boxes: number | undefined;

  if (calculateBoxes) {
    packingMethod = input.packingMethod;
    if (packingMethod !== 'tiles_per_box' && packingMethod !== 'coverage_per_box') {
      errors.push({ field: 'packingMethod', message: 'Choose tiles per box or coverage per box.' });
      packingMethod = undefined;
    } else if (packingMethod === 'tiles_per_box') {
      const n = parsePositiveInteger(input.tilesPerBox, 'tilesPerBox', 'Tiles per box', errors);
      if (n !== null) tilesPerBox = n;
    } else {
      const cov = parseRequiredPositive(
        input.coveragePerBox,
        'coveragePerBox',
        'Coverage per box',
        errors,
      );
      const covUnit = (input.coveragePerBoxUnit ?? 'sq_ft') as AreaUnit;
      if (cov !== null) {
        coveragePerBoxSqFt = toSquareFeet(cov, covUnit);
      }
    }
  }

  if (errors.length || wastePercent === null || projectAreaSqFt === null || tileFace === null || !tileUnit) {
    return { ok: false, errors };
  }

  const wasteFraction = wastePercent / 100;
  const rawExactTiles = projectAreaSqFt / tileFace;
  const rawWholeTiles = safeCeil(rawExactTiles);
  const plannedAreaWithWasteSqFt = projectAreaSqFt * (1 + wasteFraction);
  const tilesToBuy = safeCeil(rawExactTiles * (1 + wasteFraction));
  const extraTiles = tilesToBuy - rawWholeTiles;
  const purchaseFaceAreaSqFt = tilesToBuy * tileFace;

  if (calculateBoxes && packingMethod === 'tiles_per_box' && tilesPerBox !== undefined) {
    boxes = safeCeil(tilesToBuy / tilesPerBox);
  } else if (
    calculateBoxes &&
    packingMethod === 'coverage_per_box' &&
    coveragePerBoxSqFt !== undefined
  ) {
    boxes = safeCeil(plannedAreaWithWasteSqFt / coveragePerBoxSqFt);
  }

  return {
    ok: true,
    result: {
      mode,
      layout,
      wastePercent,
      projectAreaSqFt,
      projectAreaM2: fromSquareFeet(projectAreaSqFt, 'm2'),
      tileFaceAreaSqFt: tileFace,
      tileWidthDisplay: tileWidth!,
      tileLengthDisplay: tileLength!,
      tileUnit,
      rawExactTiles,
      rawWholeTiles,
      plannedAreaWithWasteSqFt,
      tilesToBuy,
      extraTiles,
      purchaseFaceAreaSqFt,
      purchaseFaceAreaM2: fromSquareFeet(purchaseFaceAreaSqFt, 'm2'),
      calculateBoxes,
      packingMethod,
      tilesPerBox,
      coveragePerBoxSqFt,
      boxes,
      warnings,
      dimensionsFt,
    },
  };
}

// Re-export for tests / consumers that need exact conversion constants
export { METERS_PER_FOOT, SQUARE_FEET_PER_SQUARE_METER, toSquareFeet, fromSquareFeet, toFeet };
