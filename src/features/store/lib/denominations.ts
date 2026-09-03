import type { StoreProduct, StoreRange } from '../api/curated';
import { packageValue } from './format';
import { snapToRange } from './range';

export type Denomination = {
  /** Absent for a value derived from a range — those are ordered by value. */
  packageId?: string;
  /** Face value in the card's currency. What it costs in USDC is quoted by the order. */
  value: number;
};

/** Paliers proposed for an open-amount product, which has no packages. */
const RANGE_STEPS = 8;

function fromRange(range: StoreRange): Denomination[] {
  const { min, max } = range;
  if (min == null || max == null || max <= min) return [];
  const seen = new Set<number>();
  const out: Denomination[] = [];
  for (let i = 0; i < RANGE_STEPS; i += 1) {
    const raw = min + ((max - min) * i) / (RANGE_STEPS - 1);
    const value = snapToRange(raw, range);
    if (value <= 0 || seen.has(value)) continue;
    seen.add(value);
    out.push({ value });
  }
  return out.sort((a, b) => a.value - b.value);
}

/** Ascending and de-duplicated — Bitrefill returns packages in no order. */
export function denominations(product: StoreProduct): Denomination[] {
  if (product.packages.length === 0) {
    return product.range ? fromRange(product.range) : [];
  }
  const seen = new Set<number>();
  const out: Denomination[] = [];
  for (const pkg of product.packages) {
    const value = packageValue(pkg);
    if (value <= 0 || seen.has(value)) continue;
    seen.add(value);
    out.push({ packageId: pkg.packageId, value });
  }
  return out.sort((a, b) => a.value - b.value);
}

/** Keeps the stepper inside the list; an empty list has no valid index. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}

/** Index of `value`, else the nearest one — a product can change under us. */
export function nearestIndex(
  list: readonly Denomination[],
  value: number,
): number {
  if (list.length === 0) return 0;
  let best = 0;
  for (let i = 1; i < list.length; i += 1) {
    if (Math.abs(list[i].value - value) < Math.abs(list[best].value - value)) {
      best = i;
    }
  }
  return best;
}
