/**
 * Tile Calculator unit tests.
 * Run: node --experimental-strip-types scripts/test-tile.mjs
 */
import assert from 'node:assert/strict';
import {
  calculateTile,
  tileFaceAreaSqFt,
  safeCeil,
  CEIL_EPSILON,
  DEFAULT_WASTE_PERCENT_STRAIGHT,
  DEFAULT_WASTE_PERCENT_DIAGONAL,
  MAX_WASTE_PERCENT,
  SQUARE_FEET_PER_SQUARE_METER,
} from '../src/utils/tile.ts';
import { toFeet } from '../src/utils/length-units.ts';
import { toSquareFeet } from '../src/utils/area-units.ts';

const TOL = 1e-9;

function approxEqual(actual, expected, tol = TOL) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `Expected ${expected}, got ${actual} (tol ${tol})`,
  );
}

function mustOk(input) {
  const out = calculateTile(input);
  assert.equal(out.ok, true, JSON.stringify(out));
  return out.result;
}

function mustFail(input, field) {
  const out = calculateTile(input);
  assert.equal(out.ok, false, `Expected failure: ${JSON.stringify(input)}`);
  if (field) {
    assert.ok(
      out.errors.some((e) => e.field === field),
      `Expected error on ${field}: ${JSON.stringify(out.errors)}`,
    );
  }
  return out;
}

const baseRect = {
  mode: 'rectangle',
  layout: 'straight',
  wastePercent: 10,
  tileWidth: 12,
  tileLength: 12,
  tileUnit: 'in',
  length: 10,
  lengthUnit: 'ft',
  width: 10,
  widthUnit: 'ft',
};

// --- Face area helpers ---
approxEqual(tileFaceAreaSqFt(12, 12, 'in'), 1);
approxEqual(tileFaceAreaSqFt(12, 24, 'in'), 2);
approxEqual(tileFaceAreaSqFt(24, 48, 'in'), 8);
approxEqual(tileFaceAreaSqFt(30, 30, 'cm'), toFeet(30, 'cm') * toFeet(30, 'cm'));

// --- Floating-point safe ceil ---
approxEqual(safeCeil(110.00000000001), 110);
approxEqual(safeCeil(100 * 1.1), 110);
assert.notEqual(Math.ceil(100 * 1.1), 110); // unprotected ceil can fail
approxEqual(safeCeil(12.5 * 1.1), 14);
approxEqual(CEIL_EPSILON, 1e-9);

// --- Layout defaults ---
approxEqual(DEFAULT_WASTE_PERCENT_STRAIGHT, 10);
approxEqual(DEFAULT_WASTE_PERCENT_DIAGONAL, 15);
approxEqual(MAX_WASTE_PERCENT, 50);

// T1 — 10×10 ft, 12×12 in, 10%
{
  const r = mustOk(baseRect);
  approxEqual(r.projectAreaSqFt, 100);
  approxEqual(r.tileFaceAreaSqFt, 1);
  approxEqual(r.rawExactTiles, 100);
  assert.equal(r.rawWholeTiles, 100);
  approxEqual(r.plannedAreaWithWasteSqFt, 110);
  assert.equal(r.tilesToBuy, 110);
  assert.equal(r.extraTiles, 10);
  approxEqual(r.purchaseFaceAreaSqFt, 110);
  const boxed = mustOk({ ...baseRect, calculateBoxes: true, packingMethod: 'tiles_per_box', tilesPerBox: 10 });
  assert.equal(boxed.boxes, 11);
}

// Floating exact 100 × 1.1 must NOT become 111
{
  const r = mustOk(baseRect);
  assert.equal(r.tilesToBuy, 110);
  assert.notEqual(r.tilesToBuy, 111);
}

// T2 — 10×10, 12×24, 10%
{
  const r = mustOk({ ...baseRect, tileWidth: 12, tileLength: 24 });
  approxEqual(r.tileFaceAreaSqFt, 2);
  approxEqual(r.rawExactTiles, 50);
  assert.equal(r.tilesToBuy, 55);
  const boxed = mustOk({
    ...baseRect,
    tileWidth: 12,
    tileLength: 24,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
    tilesPerBox: 16,
  });
  assert.equal(boxed.boxes, 4);
}

// T3 — 20×30, 12×12, 10%
{
  const r = mustOk({ ...baseRect, length: 20, width: 30 });
  approxEqual(r.projectAreaSqFt, 600);
  assert.equal(r.tilesToBuy, 660);
}

// T4 — Metric 3×4 m, 30×30 cm, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    layout: 'straight',
    wastePercent: 10,
    length: 3,
    lengthUnit: 'm',
    width: 4,
    widthUnit: 'm',
    tileWidth: 30,
    tileLength: 30,
    tileUnit: 'cm',
  });
  approxEqual(r.projectAreaSqFt, 12 * SQUARE_FEET_PER_SQUARE_METER, 1e-6);
  approxEqual(r.rawExactTiles, 133.333333333, 1e-6);
  assert.equal(r.tilesToBuy, 147);
}

// T5 — Known area 120 sq ft, 12×24, 10%
{
  const r = mustOk({
    mode: 'area',
    layout: 'straight',
    wastePercent: 10,
    area: 120,
    areaUnit: 'sq_ft',
    tileWidth: 12,
    tileLength: 24,
    tileUnit: 'in',
  });
  approxEqual(r.projectAreaSqFt, 120);
  approxEqual(r.rawExactTiles, 60);
  assert.equal(r.tilesToBuy, 66);
}

// T6 — 0% waste
{
  const r = mustOk({ ...baseRect, wastePercent: 0, layout: 'custom' });
  assert.equal(r.tilesToBuy, 100);
  assert.equal(r.extraTiles, 0);
  approxEqual(r.plannedAreaWithWasteSqFt, 100);
}

// T7 — Diagonal 15%
{
  const r = mustOk({ ...baseRect, layout: 'diagonal', wastePercent: 15 });
  assert.equal(r.tilesToBuy, 115);
  assert.equal(r.extraTiles, 15);
}

// T8 — Custom 20%
{
  const r = mustOk({ ...baseRect, layout: 'custom', wastePercent: 20 });
  assert.equal(r.tilesToBuy, 120);
}

// T9 — Tiny 2×2, 10%
{
  const r = mustOk({ ...baseRect, length: 2, width: 2 });
  approxEqual(r.rawExactTiles, 4);
  assert.equal(r.tilesToBuy, 5);
}

// T10 — Large format 24×48, 10%
{
  const r = mustOk({ ...baseRect, tileWidth: 24, tileLength: 48 });
  approxEqual(r.tileFaceAreaSqFt, 8);
  approxEqual(r.rawExactTiles, 12.5);
  assert.equal(r.tilesToBuy, 14);
}

// T11 — Exact boundary 50 sq ft, 0%
{
  const r = mustOk({
    mode: 'area',
    layout: 'custom',
    wastePercent: 0,
    area: 50,
    areaUnit: 'sq_ft',
    tileWidth: 12,
    tileLength: 12,
    tileUnit: 'in',
  });
  assert.equal(r.tilesToBuy, 50);
}

// T12 — 100.5 sq ft, 10% → ceil(110.55) = 111
{
  const r = mustOk({
    mode: 'area',
    layout: 'straight',
    wastePercent: 10,
    area: 100.5,
    areaUnit: 'sq_ft',
    tileWidth: 12,
    tileLength: 12,
    tileUnit: 'in',
  });
  approxEqual(r.rawExactTiles, 100.5);
  approxEqual(r.plannedAreaWithWasteSqFt, 110.55);
  assert.equal(r.tilesToBuy, 111);
}

// T13 — 10.5×12.25 ft, 10%
{
  const r = mustOk({ ...baseRect, length: 10.5, width: 12.25 });
  approxEqual(r.projectAreaSqFt, 128.625);
  approxEqual(r.plannedAreaWithWasteSqFt, 141.4875);
  assert.equal(r.tilesToBuy, 142);
}

// T14 — 110 tiles, 16 per box → 7
{
  const r = mustOk({
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
    tilesPerBox: 16,
  });
  assert.equal(r.tilesToBuy, 110);
  assert.equal(r.boxes, 7);
}

// T15 — coverage 16 sq ft/box on 110 planned area → 7
{
  const r = mustOk({
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'coverage_per_box',
    coveragePerBox: 16,
    coveragePerBoxUnit: 'sq_ft',
  });
  assert.equal(r.tilesToBuy, 110);
  approxEqual(r.plannedAreaWithWasteSqFt, 110);
  assert.equal(r.boxes, 7);
}

// Changing waste changes tiles, not project area
{
  const a = mustOk({ ...baseRect, wastePercent: 10 });
  const b = mustOk({ ...baseRect, wastePercent: 20, layout: 'custom' });
  approxEqual(a.projectAreaSqFt, b.projectAreaSqFt);
  assert.notEqual(a.tilesToBuy, b.tilesToBuy);
}

// Changing packing changes boxes, not tiles
{
  const a = mustOk({
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
    tilesPerBox: 10,
  });
  const b = mustOk({
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
    tilesPerBox: 16,
  });
  assert.equal(a.tilesToBuy, b.tilesToBuy);
  assert.notEqual(a.boxes, b.boxes);
}

// Coverage path must NOT derive from tile count (T2 divergence demo)
{
  const byTiles = mustOk({
    ...baseRect,
    tileWidth: 12,
    tileLength: 24,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
    tilesPerBox: 16,
  });
  const byCov = mustOk({
    ...baseRect,
    tileWidth: 12,
    tileLength: 24,
    calculateBoxes: true,
    packingMethod: 'coverage_per_box',
    coveragePerBox: 16,
    coveragePerBoxUnit: 'sq_ft',
  });
  assert.equal(byTiles.tilesToBuy, 55);
  assert.equal(byTiles.boxes, 4);
  assert.equal(byCov.boxes, 7);
}

// Waste 50 accepted; >50 rejected
mustOk({ ...baseRect, layout: 'custom', wastePercent: 50 });
mustFail({ ...baseRect, layout: 'custom', wastePercent: 51 }, 'wastePercent');
mustFail({ ...baseRect, wastePercent: -1 }, 'wastePercent');

// Invalid inputs
mustFail({ ...baseRect, tileWidth: 0 }, 'tileWidth');
mustFail({ ...baseRect, length: -5 }, 'length');
mustFail({ ...baseRect, length: NaN }, 'length');
mustFail({ ...baseRect, width: Infinity }, 'width');
mustFail({ ...baseRect, tileLength: Number.POSITIVE_INFINITY }, 'tileLength');

mustFail(
  {
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
    tilesPerBox: 0,
  },
  'tilesPerBox',
);
mustFail(
  {
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
    tilesPerBox: 1.5,
  },
  'tilesPerBox',
);
mustFail(
  {
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'coverage_per_box',
    coveragePerBox: -2,
  },
  'coveragePerBox',
);
mustFail(
  {
    ...baseRect,
    calculateBoxes: true,
    packingMethod: 'tiles_per_box',
  },
  'tilesPerBox',
);

// Metric area known mode
{
  const r = mustOk({
    mode: 'area',
    layout: 'straight',
    wastePercent: 10,
    area: 12,
    areaUnit: 'm2',
    tileWidth: 30,
    tileLength: 30,
    tileUnit: 'cm',
  });
  approxEqual(r.projectAreaSqFt, toSquareFeet(12, 'm2'), 1e-6);
  assert.equal(r.tilesToBuy, 147);
}

// Purchase face area
{
  const r = mustOk(baseRect);
  approxEqual(r.purchaseFaceAreaSqFt, r.tilesToBuy * r.tileFaceAreaSqFt);
}

console.log('test-tile: all assertions passed');
