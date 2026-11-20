/**
 * Mulch Calculator unit tests.
 * Run: node --experimental-strip-types scripts/test-mulch.mjs
 */
import assert from 'node:assert/strict';
import {
  calculateMulch,
  rectangularVolumeFt3,
  cylindricalVolumeFt3,
  knownAreaVolumeFt3,
  coverageSqFtPerCubicYard,
  bagsForPurchase,
  MULCH_BAG_PRESETS,
} from '../src/utils/mulch.ts';
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
  const out = calculateMulch(input);
  assert.equal(out.ok, true, JSON.stringify(out));
  return out.result;
}

function mustFail(input, field) {
  const out = calculateMulch(input);
  assert.equal(out.ok, false);
  if (field) {
    assert.ok(
      out.errors.some((e) => e.field === field),
      `Expected error on ${field}: ${JSON.stringify(out.errors)}`,
    );
  }
  return out;
}

function bagCount(result, volumeFt3) {
  const row = result.bags.find((b) => Math.abs(b.volumeFt3 - volumeFt3) < 1e-12);
  assert.ok(row, `Missing bag row for ${volumeFt3} ft³`);
  return row.bags;
}

const baseRect = {
  mode: 'rectangle',
  length: 10,
  lengthUnit: 'ft',
  width: 10,
  widthUnit: 'ft',
  depth: 2,
  depthUnit: 'in',
  extraPercent: 0,
};

// --- Unit conversions ---
approxEqual(toFeet(12, 'in'), 1);
approxEqual(toSquareFeet(1, 'sq_yd'), SQUARE_FEET_PER_SQUARE_YARD);
approxEqual(toSquareFeet(1, 'm2'), SQUARE_FEET_PER_SQUARE_METER);
approxEqual(fromSquareFeet(9, 'sq_yd'), 1);
approxEqual(CUBIC_METERS_PER_CUBIC_FOOT, 0.028316846592);
approxEqual(cubicFeetToCubicYards(27), 1);
approxEqual(cubicFeetToCubicMeters(1), 0.028316846592);

// Geometry primitives
approxEqual(rectangularVolumeFt3(10, 10, 2 / 12), 100 / 6);
approxEqual(cylindricalVolumeFt3(10, 3 / 12), Math.PI * 25 * (3 / 12));
approxEqual(knownAreaVolumeFt3(200, 3 / 12), 50);

// Coverage formula
approxEqual(coverageSqFtPerCubicYard(2 / 12), 162);
approxEqual(coverageSqFtPerCubicYard(3 / 12), 108);
approxEqual(coverageSqFtPerCubicYard(4 / 12), 81);
approxEqual(coverageSqFtPerCubicYard(1 / 12), 324);

// Extra material helper
{
  const { purchaseFt3, extraFt3 } = applyExtraMaterial(100, 5);
  approxEqual(purchaseFt3, 105);
  approxEqual(extraFt3, 5);
}

// Bag presets
assert.deepEqual(
  MULCH_BAG_PRESETS.map((b) => b.volumeFt3),
  [1.5, 2, 3],
);

// CASE 1 — 10×10 ft × 2 in, 0% extra
{
  const r = mustOk(baseRect);
  approxEqual(r.rawFt3, 100 / 6);
  approxEqual(r.purchaseFt3, r.rawFt3);
  approxEqual(r.rawYd3, 100 / 162);
  approxEqual(r.purchaseYd3, 100 / 162);
  approxEqual(r.rawM3, (100 / 6) * CUBIC_METERS_PER_CUBIC_FOOT);
  assert.equal(bagCount(r, 1.5), 12);
  assert.equal(bagCount(r, 2), 9);
  assert.equal(bagCount(r, 3), 6);
  approxEqual(r.coverageSqFtPerYd3, 162);
  assert.equal(r.extraPercent, 0);
  assert.equal(r.warnings.length, 0);
}

// CASE 2 — 20×30 × 3 in, 0%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 20,
    lengthUnit: 'ft',
    width: 30,
    widthUnit: 'ft',
    depth: 3,
    depthUnit: 'in',
    extraPercent: 0,
  });
  approxEqual(r.rawFt3, 150);
  approxEqual(r.rawYd3, 150 / 27);
  assert.equal(bagCount(r, 1.5), 100);
  assert.equal(bagCount(r, 2), 75);
  assert.equal(bagCount(r, 3), 50);
  approxEqual(r.coverageSqFtPerYd3, 108);
}

// CASE 3 — metric 3 m × 2 m × 5 cm, 0%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 3,
    lengthUnit: 'm',
    width: 2,
    widthUnit: 'm',
    depth: 5,
    depthUnit: 'cm',
    extraPercent: 0,
  });
  const expectedM3 = 3 * 2 * 0.05;
  const expectedFt3 = expectedM3 / CUBIC_METERS_PER_CUBIC_FOOT;
  approxEqual(r.rawFt3, expectedFt3);
  approxEqual(r.rawM3, expectedM3);
  approxEqual(r.purchaseFt3, expectedFt3);
  // 5 cm ≈ 1.97 in → within soft 1–4 in band; no horticultural soft warning
  assert.equal(r.warnings.length, 0);
}

// CASE 4 — decimal 12.5 × 8.25 × 2.5 in
{
  const r = mustOk({
    mode: 'rectangle',
    length: 12.5,
    lengthUnit: 'ft',
    width: 8.25,
    widthUnit: 'ft',
    depth: 2.5,
    depthUnit: 'in',
    extraPercent: 0,
  });
  approxEqual(r.rawFt3, 21.484375);
  assert.equal(bagCount(r, 1.5), 15);
  assert.equal(bagCount(r, 2), 11);
  assert.equal(bagCount(r, 3), 8);
  approxEqual(r.coverageSqFtPerYd3, 129.6);
}

// CASE 5 — circle Ø10 ft × 3 in
{
  const r = mustOk({
    mode: 'circle',
    diameter: 10,
    diameterUnit: 'ft',
    depth: 3,
    depthUnit: 'in',
    extraPercent: 0,
  });
  const expected = (Math.PI * 25 * 3) / 12;
  approxEqual(r.rawFt3, expected);
  assert.equal(bagCount(r, 1.5), 14);
  assert.equal(bagCount(r, 2), 10);
  assert.equal(bagCount(r, 3), 7);
  approxEqual(r.coverageSqFtPerYd3, 108);
}

// CASE 6 — known area 200 sq ft × 3 in
{
  const r = mustOk({
    mode: 'area',
    area: 200,
    areaUnit: 'sq_ft',
    depth: 3,
    depthUnit: 'in',
    extraPercent: 0,
  });
  approxEqual(r.rawFt3, 50);
  assert.equal(bagCount(r, 1.5), 34);
  assert.equal(bagCount(r, 2), 25);
  assert.equal(bagCount(r, 3), 17);
  approxEqual(r.areaSqFt, 200);
}

// CASE 7 — tiny 1×1 ft × 1 in
{
  const r = mustOk({
    mode: 'rectangle',
    length: 1,
    lengthUnit: 'ft',
    width: 1,
    widthUnit: 'ft',
    depth: 1,
    depthUnit: 'in',
    extraPercent: 0,
  });
  approxEqual(r.rawFt3, 1 / 12);
  assert.equal(bagCount(r, 1.5), 1);
  assert.equal(bagCount(r, 2), 1);
  assert.equal(bagCount(r, 3), 1);
  approxEqual(r.coverageSqFtPerYd3, 324);
}

// CASE 8 — depth 6 in: valid + soft warning
{
  const r = mustOk({
    ...baseRect,
    depth: 6,
    depthUnit: 'in',
  });
  approxEqual(r.rawFt3, 50);
  approxEqual(r.coverageSqFtPerYd3, 54);
  assert.ok(r.warnings.some((w) => w.includes('2–4 inches')));
}

// CASE 9 — custom bag 2.5 ft³ on 10×10×2 in
{
  const r = mustOk({ ...baseRect, customBagFt3: 2.5 });
  const custom = r.bags.find((b) => b.isCustom);
  assert.ok(custom);
  assert.equal(custom.bags, 7);
  assert.equal(r.bags.length, 4);
}

// CASE 10 — 5% optional overage: raw unchanged, purchase/bags change
{
  const raw = mustOk(baseRect);
  const withExtra = mustOk({ ...baseRect, extraPercent: 5 });
  approxEqual(withExtra.rawFt3, raw.rawFt3);
  approxEqual(withExtra.purchaseFt3, raw.rawFt3 * 1.05);
  assert.ok(withExtra.purchaseFt3 !== withExtra.rawFt3);
  assert.equal(bagCount(withExtra, 2), Math.ceil((raw.rawFt3 * 1.05) / 2));
  assert.equal(bagCount(raw, 2), 9);
  assert.ok(bagCount(withExtra, 2) >= bagCount(raw, 2));
}

// Area unit conversion path
{
  const r = mustOk({
    mode: 'area',
    area: 10,
    areaUnit: 'sq_yd',
    depth: 3,
    depthUnit: 'in',
    extraPercent: 0,
  });
  approxEqual(r.areaSqFt, 90);
  approxEqual(r.rawFt3, 90 * (3 / 12));
}

// bagsForPurchase helper
{
  const rows = bagsForPurchase(16.6666666667, 2.5);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].bags, 12);
  assert.equal(rows[1].bags, 9);
  assert.equal(rows[2].bags, 6);
  assert.equal(rows[3].bags, 7);
}

// Invalid: zero depth
mustFail({ ...baseRect, depth: 0 }, 'depth');

// Invalid: negative length
mustFail({ ...baseRect, length: -5 }, 'length');

// Invalid: extra > 25
mustFail({ ...baseRect, extraPercent: 26 }, 'extraPercent');

// Invalid: custom bag below 0.25
mustFail({ ...baseRect, customBagFt3: 0.1 }, 'customBagFt3');

// Invalid: custom bag above 10
mustFail({ ...baseRect, customBagFt3: 11 }, 'customBagFt3');

// Invalid: NaN / Infinity
mustFail({ ...baseRect, width: Number.NaN }, 'width');
mustFail({ ...baseRect, length: Number.POSITIVE_INFINITY }, 'length');

// Empty custom bag is fine (omitted)
{
  const r = mustOk({ ...baseRect, customBagFt3: undefined });
  assert.equal(r.bags.length, 3);
}

console.log('test-mulch: all assertions passed');
