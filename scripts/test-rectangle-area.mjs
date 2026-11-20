import assert from 'node:assert/strict';
import {
  calculateRectangleArea,
  validateRectangleAreaInput,
} from '../src/utils/rectangle-area.ts';

const ok = calculateRectangleArea({ width: 10, height: 5, unit: 'in' });
assert.equal(ok.ok, true);
if (ok.ok) {
  assert.equal(ok.result.area, 50);
  assert.equal(ok.result.unitLabel, 'square inches');
}

const meters = calculateRectangleArea({ width: 2.5, height: 4, unit: 'm' });
assert.equal(meters.ok, true);
if (meters.ok) {
  assert.equal(meters.result.area, 10);
  assert.equal(meters.result.unitLabel, 'square meters');
}

const invalid = calculateRectangleArea({ width: 0, height: -1, unit: 'in' });
assert.equal(invalid.ok, false);
if (!invalid.ok) {
  assert.ok(invalid.errors.some((e) => e.field === 'width'));
  assert.ok(invalid.errors.some((e) => e.field === 'height'));
}

const unitError = validateRectangleAreaInput({ width: 1, height: 1, unit: 'yards' });
assert.ok(unitError.some((e) => e.field === 'unit'));

console.log('rectangle-area tests passed');
