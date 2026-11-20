/**
 * Shared extra/waste contingency math for material calculators.
 * Applies a percent uplift to a raw volume; does not encode compaction.
 */

export function applyExtraMaterial(
  rawFt3: number,
  extraPercent: number,
): {
  purchaseFt3: number;
  extraFt3: number;
} {
  const extraFraction = extraPercent / 100;
  const purchaseFt3 = rawFt3 * (1 + extraFraction);
  return { purchaseFt3, extraFt3: purchaseFt3 - rawFt3 };
}
