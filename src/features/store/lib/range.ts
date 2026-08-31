/**
 * Open-amount (ranged) products. Bitrefill gives a `range` of
 * `{ min, max, step }` instead of fixed packages; the value the user types
 * has to land on a step inside the bounds or the order is rejected upstream.
 */
import type { StoreRange } from './types';
import { formatMoney } from './format';

/** Null when the amount is orderable, otherwise the reason, as UI copy. */
export function rangeAmountError(
  amount: number,
  range: StoreRange,
  currency?: string,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount';

  const { min, max, step } = range;
  if (min != null && amount < min) {
    return `Minimum ${formatMoney(min, currency)}`;
  }
  if (max != null && amount > max) {
    return `Maximum ${formatMoney(max, currency)}`;
  }
  if (step != null && step > 0) {
    // Compare in integer cents — 0.1 + 0.2 arithmetic makes a modulo on
    // floats unreliable for amounts with decimals.
    const offset = Math.round((amount - (min ?? 0)) * 100);
    if (offset % Math.round(step * 100) !== 0) {
      return `Use steps of ${formatMoney(step, currency)}`;
    }
  }
  return null;
}

/** Snaps an amount to the nearest valid step inside the bounds. Used to seed
 *  the field with something orderable rather than an empty box. */
export function snapToRange(amount: number, range: StoreRange): number {
  const { min = 0, max, step } = range;
  let out = amount;
  if (step != null && step > 0) {
    const steps = Math.round((out - min) / step);
    out = min + steps * step;
  }
  if (out < min) out = min;
  if (max != null && out > max) out = max;
  return Math.round(out * 100) / 100;
}
