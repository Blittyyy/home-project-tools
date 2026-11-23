/**
 * Paint Calculator unit tests.
 * Run: node --experimental-strip-types scripts/test-paint.mjs
 */
import assert from 'node:assert/strict';
import {
  calculatePaint,
  roomGrossWallAreaSqFt,
  sumWallAreasSqFt,
  openingAreaFromCounts,
  paintLineFromArea,
  usGallonsToLiters,
  LITERS_PER_US_GALLON,
  DOOR_OPENING_SQ_FT,
  WINDOW_OPENING_SQ_FT,
  DEFAULT_COVERAGE_SQ_FT_PER_GAL,
} from '../src/utils/paint.ts';
import { toFeet, METERS_PER_FOOT } from '../src/utils/length-units.ts';
import { SQUARE_FEET_PER_SQUARE_METER } from '../src/utils/area-units.ts';

const TOL = 1e-9;

function approxEqual(actual, expected, tol = TOL) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `Expected ${expected}, got ${actual} (tol ${tol})`,
  );
}

function mustOk(input) {
  const out = calculatePaint(input);
  assert.equal(out.ok, true, JSON.stringify(out));
  return out.result;
}

function mustFail(input, field) {
  const out = calculatePaint(input);
  assert.equal(out.ok, false);
  if (field) {
    assert.ok(
      out.errors.some((e) => e.field === field),
      `Expected error on ${field}: ${JSON.stringify(out.errors)}`,
    );
  }
  return out;
}

const baseRoom = {
  mode: 'room',
  length: 10,
  lengthUnit: 'ft',
  width: 12,
  widthUnit: 'ft',
  height: 8,
  heightUnit: 'ft',
  wallCoats: 2,
  wallCoverageSqFtPerGal: 350,
  subtractOpenings: false,
  includeCeiling: false,
};

assert.equal(DOOR_OPENING_SQ_FT, 20);
assert.equal(WINDOW_OPENING_SQ_FT, 15);
assert.equal(DEFAULT_COVERAGE_SQ_FT_PER_GAL, 350);
approxEqual(LITERS_PER_US_GALLON, 3.785411784);
approxEqual(usGallonsToLiters(1), 3.785411784);
approxEqual(roomGrossWallAreaSqFt(10, 12, 8), 352);
approxEqual(openingAreaFromCounts(1, 2), 50);
approxEqual(sumWallAreasSqFt([{ widthFt: 10, heightFt: 8 }, { widthFt: 12, heightFt: 8 }]), 176);

// CASE 1 — 10×12×8, no openings, 2 coats, 350
{
  const r = mustOk(baseRoom);
  approxEqual(r.grossWallSqFt, 352);
  approxEqual(r.openingSqFt, 0);
  approxEqual(r.paintableWallSqFt, 352);
  approxEqual(r.walls.coatedAreaSqFt, 704);
  approxEqual(r.walls.calculatedGallons, 704 / 350);
  assert.equal(r.walls.purchaseGallons, 3);
  approxEqual(r.walls.calculatedLiters, (704 / 350) * LITERS_PER_US_GALLON);
  assert.equal(r.ceiling, null);
}

// CASE 2 — same room, 1 coat
{
  const r = mustOk({ ...baseRoom, wallCoats: 1 });
  approxEqual(r.walls.calculatedGallons, 352 / 350);
  assert.equal(r.walls.purchaseGallons, 2);
}

// CASE 3 — 12×10×8 (same gross), 1 door + 2 windows
{
  const r = mustOk({
    ...baseRoom,
    length: 12,
    width: 10,
    subtractOpenings: true,
    openingMethod: 'counts',
    doorCount: 1,
    windowCount: 2,
  });
  approxEqual(r.grossWallSqFt, 352);
  approxEqual(r.openingSqFt, 50);
  approxEqual(r.paintableWallSqFt, 302);
  approxEqual(r.walls.coatedAreaSqFt, 604);
  approxEqual(r.walls.calculatedGallons, 604 / 350);
  assert.equal(r.walls.purchaseGallons, 2);
}

// CASE 4 — custom opening area 50 sq ft
{
  const r = mustOk({
    ...baseRoom,
    subtractOpenings: true,
    openingMethod: 'custom',
    customOpeningArea: 50,
    customOpeningUnit: 'sq_ft',
  });
  approxEqual(r.openingSqFt, 50);
  approxEqual(r.paintableWallSqFt, 302);
  assert.equal(r.walls.purchaseGallons, 2);
}

// CASE 5 — opening >= gross → invalid
mustFail(
  {
    ...baseRoom,
    subtractOpenings: true,
    openingMethod: 'custom',
    customOpeningArea: 352,
    customOpeningUnit: 'sq_ft',
  },
  'customOpeningArea',
);
mustFail(
  {
    ...baseRoom,
    subtractOpenings: true,
    openingMethod: 'custom',
    customOpeningArea: 400,
    customOpeningUnit: 'sq_ft',
  },
  'customOpeningArea',
);

// CASE 6 — ceiling 10×12, 2 coats, 350
{
  const r = mustOk({
    ...baseRoom,
    includeCeiling: true,
    ceilingCoats: 2,
    ceilingCoverageSqFtPerGal: 350,
  });
  assert.ok(r.ceiling);
  approxEqual(r.ceiling.areaSqFt, 120);
  approxEqual(r.ceiling.calculatedGallons, 240 / 350);
  assert.equal(r.ceiling.purchaseGallons, 1);
}

// CASE 7 — ceiling independent from walls
{
  const wallsOnly = mustOk(baseRoom);
  const withCeiling = mustOk({
    ...baseRoom,
    includeCeiling: true,
    ceilingCoats: 3,
    ceilingCoverageSqFtPerGal: 300,
  });
  approxEqual(withCeiling.walls.calculatedGallons, wallsOnly.walls.calculatedGallons);
  assert.equal(withCeiling.walls.purchaseGallons, wallsOnly.walls.purchaseGallons);
  assert.ok(withCeiling.ceiling);
  approxEqual(withCeiling.ceiling.calculatedGallons, (120 * 3) / 300);
}

// CASE 8 — one wall 10×8, 2 coats, 350
{
  const r = mustOk({
    mode: 'walls',
    wallCoats: 2,
    wallCoverageSqFtPerGal: 350,
    walls: [{ width: 10, widthUnit: 'ft', height: 8, heightUnit: 'ft' }],
  });
  approxEqual(r.grossWallSqFt, 80);
  approxEqual(r.walls.calculatedGallons, 160 / 350);
  assert.equal(r.walls.purchaseGallons, 1);
  assert.equal(r.wallCount, 1);
}

// CASE 9 — multiple walls
{
  const r = mustOk({
    mode: 'walls',
    wallCoats: 2,
    wallCoverageSqFtPerGal: 350,
    walls: [
      { width: 10, widthUnit: 'ft', height: 8, heightUnit: 'ft' },
      { width: 12, widthUnit: 'ft', height: 8, heightUnit: 'ft' },
      { width: 10, widthUnit: 'ft', height: 8, heightUnit: 'ft' },
    ],
  });
  approxEqual(r.grossWallSqFt, 256);
  assert.equal(r.wallCount, 3);
  approxEqual(r.walls.calculatedGallons, 512 / 350);
}

// CASE 10 — known area 500
{
  const r = mustOk({
    mode: 'area',
    area: 500,
    areaUnit: 'sq_ft',
    wallCoats: 2,
    wallCoverageSqFtPerGal: 350,
  });
  approxEqual(r.paintableWallSqFt, 500);
  approxEqual(r.walls.calculatedGallons, 1000 / 350);
  assert.equal(r.walls.purchaseGallons, 3);
}

// CASE 11 — custom coverage 400
{
  const r = mustOk({ ...baseRoom, wallCoverageSqFtPerGal: 400 });
  approxEqual(r.paintableWallSqFt, 352);
  approxEqual(r.walls.calculatedGallons, 704 / 400);
  assert.equal(r.walls.purchaseGallons, 2);
}

// CASE 12 — one coat already covered; assert area unchanged by coverage
{
  const a = mustOk({ ...baseRoom, wallCoverageSqFtPerGal: 350 });
  const b = mustOk({ ...baseRoom, wallCoverageSqFtPerGal: 400 });
  approxEqual(a.paintableWallSqFt, b.paintableWallSqFt);
  assert.ok(a.walls.calculatedGallons !== b.walls.calculatedGallons);
}

// CASE 13 — three coats
{
  const r = mustOk({ ...baseRoom, wallCoats: 3 });
  approxEqual(r.walls.coatedAreaSqFt, 352 * 3);
  approxEqual(r.walls.calculatedGallons, (352 * 3) / 350);
  assert.equal(r.walls.purchaseGallons, Math.ceil((352 * 3) / 350));
}

// CASE 14 — metric room 3.5 m × 4 m × 2.5 m
{
  const r = mustOk({
    mode: 'room',
    length: 3.5,
    lengthUnit: 'm',
    width: 4,
    widthUnit: 'm',
    height: 2.5,
    heightUnit: 'm',
    wallCoats: 2,
    wallCoverageSqFtPerGal: 350,
  });
  const lengthFt = 3.5 / METERS_PER_FOOT;
  const widthFt = 4 / METERS_PER_FOOT;
  const heightFt = 2.5 / METERS_PER_FOOT;
  const expected = 2 * (lengthFt + widthFt) * heightFt;
  approxEqual(r.grossWallSqFt, expected);
}

// CASE 15 — decimal dimensions
{
  const r = mustOk({
    ...baseRoom,
    length: 10.5,
    width: 11.25,
    height: 8,
  });
  approxEqual(r.grossWallSqFt, 2 * (10.5 + 11.25) * 8);
}

// CASE 16 — tiny wall
{
  const r = mustOk({
    mode: 'walls',
    wallCoats: 1,
    wallCoverageSqFtPerGal: 350,
    walls: [{ width: 2, widthUnit: 'ft', height: 2, heightUnit: 'ft' }],
  });
  approxEqual(r.walls.calculatedGallons, 4 / 350);
  assert.equal(r.walls.purchaseGallons, 1);
}

// CASE 17 — invalid zero
mustFail({ ...baseRoom, height: 0 }, 'height');
mustFail({ mode: 'area', area: 0, areaUnit: 'sq_ft', wallCoats: 2, wallCoverageSqFtPerGal: 350 }, 'area');

// CASE 18 — invalid negative
mustFail({ ...baseRoom, length: -5 }, 'length');

// CASE 19 — invalid coat 0
mustFail({ ...baseRoom, wallCoats: 0 }, 'wallCoats');

// CASE 20 — invalid coverage
mustFail({ ...baseRoom, wallCoverageSqFtPerGal: 0 }, 'wallCoverageSqFtPerGal');
mustFail({ ...baseRoom, wallCoverageSqFtPerGal: 40 }, 'wallCoverageSqFtPerGal');
mustFail({ ...baseRoom, wallCoverageSqFtPerGal: 900 }, 'wallCoverageSqFtPerGal');

// Openings reduce wall area only; coats multiply demand
{
  const open = mustOk({
    ...baseRoom,
    subtractOpenings: true,
    openingMethod: 'counts',
    doorCount: 1,
    windowCount: 0,
  });
  approxEqual(open.grossWallSqFt, 352);
  approxEqual(open.paintableWallSqFt, 332);
  approxEqual(open.walls.coatedAreaSqFt, 664);
}

// paintLineFromArea helper + ceil
{
  const line = paintLineFromArea(302, 2, 350);
  approxEqual(line.calculatedGallons, 604 / 350);
  assert.equal(line.purchaseGallons, 2);
}

// Area conversion m²
{
  const r = mustOk({
    mode: 'area',
    area: 10,
    areaUnit: 'm2',
    wallCoats: 1,
    wallCoverageSqFtPerGal: 350,
  });
  approxEqual(r.paintableWallSqFt, 10 * SQUARE_FEET_PER_SQUARE_METER);
}

// Soft coverage warning still calculates
{
  const r = mustOk({ ...baseRoom, wallCoverageSqFtPerGal: 180 });
  assert.ok(r.warnings.some((w) => w.includes('unusual')));
  assert.equal(r.walls.purchaseGallons, Math.ceil(704 / 180));
}

// Walls mode ignores openings flags if somehow passed
{
  const r = mustOk({
    mode: 'walls',
    wallCoats: 2,
    wallCoverageSqFtPerGal: 350,
    subtractOpenings: true,
    doorCount: 5,
    windowCount: 5,
    walls: [{ width: 10, widthUnit: 'ft', height: 8, heightUnit: 'ft' }],
  });
  approxEqual(r.openingSqFt, 0);
  approxEqual(r.paintableWallSqFt, 80);
}

// toFeet sanity
approxEqual(toFeet(24, 'in'), 2);

console.log('test-paint: all assertions passed');
