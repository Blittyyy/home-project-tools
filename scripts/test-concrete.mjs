/**
 * Concrete Calculator unit tests.
 * Run: node --experimental-strip-types scripts/test-concrete.mjs
 */
import assert from 'node:assert/strict';
import {
  calculateConcrete,
  rectangularVolumeFt3,
  cylindricalVolumeFt3,
  postHolesVolumeFt3,
  applyExtraMaterial,
  bagsForPurchase,
  CONCRETE_BAG_YIELDS,
} from '../src/utils/concrete.ts';
import {
  toFeet,
  fromFeet,
  cubicFeetToCubicYards,
  cubicFeetToCubicMeters,
  CUBIC_METERS_PER_CUBIC_FOOT,
} from '../src/utils/length-units.ts';

const TOL = 1e-9;

function approxEqual(actual, expected, tol = TOL) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `Expected ${expected}, got ${actual} (tol ${tol})`,
  );
}

function assertBags(result, expected) {
  const byWeight = Object.fromEntries(result.bags.map((b) => [b.weightLb, b.bags]));
  assert.equal(byWeight[40], expected[40]);
  assert.equal(byWeight[50], expected[50]);
  assert.equal(byWeight[60], expected[60]);
  assert.equal(byWeight[80], expected[80]);
}

function mustOk(input) {
  const out = calculateConcrete(input);
  assert.equal(out.ok, true, JSON.stringify(out));
  return out.result;
}

function mustFail(input, field) {
  const out = calculateConcrete(input);
  assert.equal(out.ok, false);
  if (field) {
    assert.ok(
      out.errors.some((e) => e.field === field),
      `Expected error on ${field}: ${JSON.stringify(out.errors)}`,
    );
  }
  return out;
}

// --- Unit conversions ---
approxEqual(toFeet(12, 'in'), 1);
approxEqual(toFeet(1, 'ft'), 1);
approxEqual(toFeet(0.3048, 'm'), 1);
approxEqual(toFeet(30.48, 'cm'), 1);
approxEqual(fromFeet(1, 'in'), 12);
approxEqual(CUBIC_METERS_PER_CUBIC_FOOT, 0.028316846592);
approxEqual(cubicFeetToCubicYards(27), 1);
approxEqual(cubicFeetToCubicMeters(1), 0.028316846592);

// Geometry primitives
approxEqual(rectangularVolumeFt3(10, 10, 4 / 12), 100 / 3);
approxEqual(cylindricalVolumeFt3(10, 4 / 12), Math.PI * 25 * (4 / 12));
approxEqual(postHolesVolumeFt3(1, 3, 4), 4 * Math.PI * 0.25 * 3);

// Extra material preserves raw vs purchase
{
  const { purchaseFt3, extraFt3 } = applyExtraMaterial(100, 10);
  approxEqual(purchaseFt3, 110);
  approxEqual(extraFt3, 10);
}

// Bag ceiling boundary: exact multiple should not add an extra bag
{
  const exact = bagsForPurchase(0.6);
  assert.equal(exact.find((b) => b.weightLb === 80).bags, 1);
  const justOver = bagsForPurchase(0.6000001);
  assert.equal(justOver.find((b) => b.weightLb === 80).bags, 2);
}

assert.equal(CONCRETE_BAG_YIELDS.length, 4);

// CASE 1 — 10×10×4 in, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 10,
    lengthUnit: 'ft',
    width: 10,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 100 / 3);
  approxEqual(r.purchaseFt3, (100 / 3) * 1.1);
  approxEqual(r.purchaseYd3, ((100 / 3) * 1.1) / 27);
  assertBags(r, { 40: 123, 50: 98, 60: 82, 80: 62 });
  assert.ok(r.rawFt3 !== r.purchaseFt3);
}

// CASE 2 — same, 0%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 10,
    lengthUnit: 'ft',
    width: 10,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 0,
  });
  approxEqual(r.rawFt3, 100 / 3);
  approxEqual(r.purchaseFt3, 100 / 3);
  approxEqual(r.purchaseYd3, 100 / 3 / 27);
  assertBags(r, { 40: 112, 50: 89, 60: 75, 80: 56 });
}

// CASE 3 — 12×20×4 in, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 12,
    lengthUnit: 'ft',
    width: 20,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 80);
  approxEqual(r.purchaseFt3, 88);
  approxEqual(r.purchaseYd3, 88 / 27);
  assertBags(r, { 40: 294, 50: 235, 60: 196, 80: 147 });
}

// CASE 4 — 12×16×4 in, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 12,
    lengthUnit: 'ft',
    width: 16,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 64);
  approxEqual(r.purchaseFt3, 70.4);
  approxEqual(r.purchaseYd3, 70.4 / 27);
  assertBags(r, { 40: 235, 50: 188, 60: 157, 80: 118 });
}

// CASE 5 — metric 3 m × 2 m × 10 cm, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 3,
    lengthUnit: 'm',
    width: 2,
    widthUnit: 'm',
    thickness: 10,
    thicknessUnit: 'cm',
    extraPercent: 10,
  });
  const expectedRaw = toFeet(3, 'm') * toFeet(2, 'm') * toFeet(10, 'cm');
  approxEqual(r.rawFt3, expectedRaw);
  approxEqual(r.purchaseFt3, expectedRaw * 1.1);
  approxEqual(r.rawM3, 0.6, 1e-12);
  assertBags(r, { 40: 78, 50: 63, 60: 52, 80: 39 });
}

// CASE 6 — 2×2×4 in, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 2,
    lengthUnit: 'ft',
    width: 2,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 4 / 3);
  approxEqual(r.purchaseFt3, (4 / 3) * 1.1);
  assertBags(r, { 40: 5, 50: 4, 60: 4, 80: 3 });
}

// CASE 7 — decimals 10.5 × 8.25 × 3.5 in, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 10.5,
    lengthUnit: 'ft',
    width: 8.25,
    widthUnit: 'ft',
    thickness: 3.5,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 25.265625);
  approxEqual(r.purchaseFt3, 27.7921875);
  assertBags(r, { 40: 93, 50: 75, 60: 62, 80: 47 });
}

// CASE 8 — circle Ø 10 ft × 4 in, 10%
{
  const r = mustOk({
    mode: 'circle',
    diameter: 10,
    diameterUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  const expectedRaw = Math.PI * 25 * (4 / 12);
  approxEqual(r.rawFt3, expectedRaw);
  approxEqual(r.purchaseFt3, expectedRaw * 1.1);
  assertBags(r, { 40: 96, 50: 77, 60: 64, 80: 48 });
}

// CASE 9 — posts 12 in × 36 in × 4, 10%
{
  const r = mustOk({
    mode: 'posts',
    diameter: 12,
    diameterUnit: 'in',
    depth: 36,
    depthUnit: 'in',
    holeCount: 4,
    extraPercent: 10,
  });
  const expectedRaw = 4 * Math.PI * 0.25 * 3;
  approxEqual(r.rawFt3, expectedRaw);
  approxEqual(r.purchaseFt3, expectedRaw * 1.1);
  assertBags(r, { 40: 35, 50: 28, 60: 24, 80: 18 });
}

// CASE 10 — single post 10 in × 30 in, 0%
{
  const r = mustOk({
    mode: 'posts',
    diameter: 10,
    diameterUnit: 'in',
    depth: 30,
    depthUnit: 'in',
    holeCount: 1,
    extraPercent: 0,
  });
  const expectedRaw = Math.PI * (5 / 12) ** 2 * 2.5;
  approxEqual(r.rawFt3, expectedRaw);
  approxEqual(r.purchaseFt3, expectedRaw);
  assertBags(r, { 40: 5, 50: 4, 60: 4, 80: 3 });
}

// Tiny 1×1×1 in, 10%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 1,
    lengthUnit: 'ft',
    width: 1,
    widthUnit: 'ft',
    thickness: 1,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  approxEqual(r.rawFt3, 1 / 12);
  approxEqual(r.purchaseFt3, (1 / 12) * 1.1);
  assertBags(r, { 40: 1, 50: 1, 60: 1, 80: 1 });
}

// Mixed units: 144 in × 16 ft × 4 in == 12×16×4
{
  const a = mustOk({
    mode: 'rectangle',
    length: 144,
    lengthUnit: 'in',
    width: 16,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  const b = mustOk({
    mode: 'rectangle',
    length: 12,
    lengthUnit: 'ft',
    width: 16,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  approxEqual(a.rawFt3, b.rawFt3);
  approxEqual(a.purchaseFt3, b.purchaseFt3);
}

// Custom waste 25%
{
  const r = mustOk({
    mode: 'rectangle',
    length: 10,
    lengthUnit: 'ft',
    width: 10,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 25,
  });
  approxEqual(r.purchaseFt3, (100 / 3) * 1.25);
}

// Reject > 25%
mustFail(
  {
    mode: 'rectangle',
    length: 10,
    lengthUnit: 'ft',
    width: 10,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 26,
  },
  'extraPercent',
);

// Invalid zero / negative
mustFail(
  {
    mode: 'rectangle',
    length: 0,
    lengthUnit: 'ft',
    width: 10,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  },
  'length',
);
mustFail(
  {
    mode: 'rectangle',
    length: -1,
    lengthUnit: 'ft',
    width: 10,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  },
  'length',
);

// Invalid post count
mustFail(
  {
    mode: 'posts',
    diameter: 10,
    diameterUnit: 'in',
    depth: 30,
    depthUnit: 'in',
    holeCount: 0,
    extraPercent: 10,
  },
  'holeCount',
);
mustFail(
  {
    mode: 'posts',
    diameter: 10,
    diameterUnit: 'in',
    depth: 30,
    depthUnit: 'in',
    holeCount: 1.5,
    extraPercent: 10,
  },
  'holeCount',
);

// No intermediate rounding: 10×10×4 at 10% purchase yd³ exact
{
  const r = mustOk({
    mode: 'rectangle',
    length: 10,
    lengthUnit: 'ft',
    width: 10,
    widthUnit: 'ft',
    thickness: 4,
    thicknessUnit: 'in',
    extraPercent: 10,
  });
  assert.equal(r.purchaseYd3, r.purchaseFt3 / 27);
  assert.equal(r.rawYd3, r.rawFt3 / 27);
}

console.log('concrete calculator tests passed');
