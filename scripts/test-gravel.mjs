/**
 * Gravel Calculator unit tests.
 * Run: node --experimental-strip-types scripts/test-gravel.mjs
 */
import assert from 'node:assert/strict';
import {
  calculateGravel,
  rectangularVolumeFt3,
  cylindricalVolumeFt3,
  knownAreaVolumeFt3,
  weightFromVolumeFt3,
  CRUSHED_STONE_LB_PER_FT3,
  DRY_GRAVEL_LB_PER_FT3,
  DRY_GRAVEL_LB_PER_YD3,
} from '../src/utils/gravel.ts';
import { applyExtraMaterial } from '../src/utils/extra-material.ts';
import {
  toFeet,
  cubicFeetToCubicYards,
  cubicFeetToCubicMeters,
  CUBIC_METERS_PER_CUBIC_FOOT,
} from '../src/utils/length-units.ts';
import {
  toSquareFeet,
  fromSquareFeet,
  SQUARE_FEET_PER_SQUARE_YARD,
  SQUARE_FEET_PER_SQUARE_METER,
} from '../src/utils/area-units.ts';

const TOL = 1e-9;

function approxEqual(actual, expected, tol = TOL) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `Expected ${expected}, got ${actual} (tol ${tol})`,
  );
}

function mustOk(input) {
  const out = calculateGravel(input);
  assert.equal(out.ok, true, JSON.stringify(out));
  return out.result;
}

function mustFail(input, field) {
  const out = calculateGravel(input);
  assert.equal(out.ok, false);
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
  length: 10,
  lengthUnit: 'ft',
  width: 10,
  widthUnit: 'ft',
  depth: 2,
  depthUnit: 'in',
  materialId: 'crushed_stone',
  extraPercent: 10,
};

// --- Unit conversions ---
approxEqual(toFeet(12, 'in'), 1);
approxEqual(toSquareFeet(1, 'sq_yd'), SQUARE_FEET_PER_SQUARE_YARD);
approxEqual(toSquareFeet(1, 'm2'), SQUARE_FEET_PER_SQUARE_METER);
approxEqual(fromSquareFeet(9, 'sq_yd'), 1);
approxEqual(CUBIC_METERS_PER_CUBIC_FOOT, 0.028316846592);
approxEqual(cubicFeetToCubicYards(27), 1);
approxEqual(cubicFeetToCubicMeters(1), 0.028316846592);
approxEqual(DRY_GRAVEL_LB_PER_FT3, DRY_GRAVEL_LB_PER_YD3 / 27);
approxEqual(CRUSHED_STONE_LB_PER_FT3, 100);

// Geometry primitives
approxEqual(rectangularVolumeFt3(10, 10, 2 / 12), 100 / 6);
approxEqual(cylindricalVolumeFt3(10, 3 / 12), Math.PI * 25 * (3 / 12));
approxEqual(knownAreaVolumeFt3(200, 4 / 12), 200 * (4 / 12));

// Extra material
{
  const { purchaseFt3, extraFt3 } = applyExtraMaterial(100, 10);
  approxEqual(purchaseFt3, 110);
  approxEqual(extraFt3, 10);
}

// Weight helper
{
  const w = weightFromVolumeFt3(27, 100);
  approxEqual(w.lb, 2700);
  approxEqual(w.tons, 1.35);
}

// CASE 1 — 10×10 ft × 2 in, 10%, 100 lb/ft³
{
  const r = mustOk(baseRect);
  approxEqual(r.rawFt3, 100 / 6);
  approxEqual(r.rawYd3, 100 / 162);
  approxEqual(r.purchaseYd3, (100 / 162) * 1.1);
  approxEqual(r.purchaseTons, ((100 / 6) * 1.1 * 100) / 2000);
  approxEqual(r.densityLbPerFt3, 100);
  assert.ok(r.rawFt3 !== r.purchaseFt3);
}

// CASE 2 — 20×30 × 3 in, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 20,
    lengthUnit: 'ft',
    width: 30,
    widthUnit: 'ft',
    depth: 3,
    depthUnit: 'in',
    materialId: 'crushed_stone',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 150);
  approxEqual(r.purchaseFt3, 165);
  approxEqual(r.purchaseYd3, 165 / 27);
  approxEqual(r.purchaseTons, 8.25);
}

// CASE 3 — metric 3m × 2m × 5cm, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 3,
    lengthUnit: 'm',
    width: 2,
    widthUnit: 'm',
    depth: 5,
    depthUnit: 'cm',
    materialId: 'crushed_stone',
    extraPercent: 10,
  });
  const expectedM3 = 3 * 2 * 0.05;
  const expectedFt3 = expectedM3 / CUBIC_METERS_PER_CUBIC_FOOT;
  approxEqual(r.rawFt3, expectedFt3);
  approxEqual(r.rawM3, expectedM3);
  approxEqual(r.purchaseFt3, expectedFt3 * 1.1);
  approxEqual(r.purchaseTons, (expectedFt3 * 1.1 * 100) / 2000);
}

// CASE 4 — circle Ø10 ft × 3 in, 10%
{
  const r = mustOk({
    mode: 'circle',
    diameter: 10,
    diameterUnit: 'ft',
    depth: 3,
    depthUnit: 'in',
    materialId: 'crushed_stone',
    extraPercent: 10,
  });
  const expected = Math.PI * 25 * (3 / 12);
  approxEqual(r.rawFt3, expected);
  approxEqual(r.purchaseFt3, expected * 1.1);
}

// CASE 5 — known area 200 sq ft × 4 in, 10%
{
  const r = mustOk({
    mode: 'area',
    area: 200,
    areaUnit: 'sq_ft',
    depth: 4,
    depthUnit: 'in',
    materialId: 'crushed_stone',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 200 * (4 / 12));
  approxEqual(r.purchaseYd3, (200 * (4 / 12) * 1.1) / 27);
  approxEqual(r.dimensionsFt.areaSqFt, 200);
}

// CASE 6 — 0% extra
{
  const r = mustOk({ ...baseRect, extraPercent: 0 });
  approxEqual(r.rawFt3, r.purchaseFt3);
  approxEqual(r.rawTons, r.purchaseTons);
  approxEqual(r.extraYd3, 0);
}

// CASE 7 — dry gravel density 2850/27
{
  const r = mustOk({ ...baseRect, materialId: 'gravel_dry_quarter_to_2' });
  approxEqual(r.densityLbPerFt3, 2850 / 27);
  approxEqual(r.rawFt3, 100 / 6); // volume unchanged
  approxEqual(r.purchaseTons, ((100 / 6) * 1.1 * (2850 / 27)) / 2000);
}

// CASE 8 — custom density 90
{
  const r = mustOk({
    ...baseRect,
    materialId: 'custom',
    densityLbPerFt3: 90,
  });
  approxEqual(r.densityLbPerFt3, 90);
  approxEqual(r.rawFt3, 100 / 6);
  approxEqual(r.purchaseTons, ((100 / 6) * 1.1 * 90) / 2000);
  assert.equal(r.materialLabel, 'Custom density');
}

// CASE 9 — tiny project
{
  const r = mustOk({
    mode: 'rectangle',
    length: 1,
    lengthUnit: 'ft',
    width: 1,
    widthUnit: 'ft',
    depth: 1,
    depthUnit: 'in',
    materialId: 'crushed_stone',
    extraPercent: 0,
  });
  approxEqual(r.rawFt3, 1 / 12);
  approxEqual(r.purchaseTons, ((1 / 12) * 100) / 2000);
}

// Density changes weight only
{
  const a = mustOk({ ...baseRect, materialId: 'crushed_stone' });
  const b = mustOk({
    ...baseRect,
    materialId: 'custom',
    densityLbPerFt3: 90,
  });
  approxEqual(a.rawFt3, b.rawFt3);
  approxEqual(a.purchaseFt3, b.purchaseFt3);
  assert.notEqual(a.purchaseTons, b.purchaseTons);
}

// Extra changes purchase, not raw
{
  const a = mustOk({ ...baseRect, extraPercent: 0 });
  const b = mustOk({ ...baseRect, extraPercent: 10 });
  approxEqual(a.rawFt3, b.rawFt3);
  approxEqual(a.rawTons, b.rawTons);
  assert.notEqual(a.purchaseFt3, b.purchaseFt3);
  assert.notEqual(a.purchaseTons, b.purchaseTons);
}

// Invalid cases
mustFail({ ...baseRect, depth: 0 }, 'depth');
mustFail({ ...baseRect, length: -5 }, 'length');
mustFail({ ...baseRect, materialId: 'custom' }, 'densityLbPerFt3');
mustFail(
  { ...baseRect, materialId: 'custom', densityLbPerFt3: 30 },
  'densityLbPerFt3',
);
mustFail(
  { ...baseRect, materialId: 'custom', densityLbPerFt3: 200 },
  'densityLbPerFt3',
);
mustFail({ ...baseRect, extraPercent: 30 }, 'extraPercent');
mustFail({ ...baseRect, length: Number.NaN }, 'length');
mustFail({ ...baseRect, width: Number.POSITIVE_INFINITY }, 'width');
mustFail(
  {
    mode: 'area',
    area: 0,
    areaUnit: 'sq_ft',
    depth: 4,
    depthUnit: 'in',
    materialId: 'crushed_stone',
    extraPercent: 10,
  },
  'area',
);

// Soft density warning still calculates
{
  const r = mustOk({
    ...baseRect,
    materialId: 'custom',
    densityLbPerFt3: 50,
  });
  assert.ok(r.warnings.length >= 1);
}

console.log('test-gravel: all assertions passed');
