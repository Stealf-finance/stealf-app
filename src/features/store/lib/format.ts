/** Money and denomination formatting for the Store. Pure. */
import type { StorePackage, StoreProduct } from '../api/curated';

const SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

export const currencySymbol = (code?: string): string =>
  (code && SYMBOLS[code]) || code || '';

/** `25` → "€25", `25.5` → "€25.50". Whole amounts drop the cents. */
export function formatMoney(amount: number, currency?: string): string {
  const symbol = currencySymbol(currency);
  const body = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return symbol.length === 1 ? `${symbol}${body}` : `${body} ${symbol}`.trim();
}

/** Bitrefill types a package value as `string | number`. Coerce, defensively. */
export function packageValue(pkg: StorePackage): number {
  const n = typeof pkg.value === 'number' ? pkg.value : Number(pkg.value);
  return Number.isFinite(n) ? n : 0;
}

/** Always a range — a list of values truncates to noise on a half-width tile. */
export function denominationSummary(product: StoreProduct): string {
  if (product.packages.length > 0) {
    // Bitrefill does not sort packages, so take the bounds, not the ends.
    const values = product.packages.map(packageValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max
      ? formatMoney(min, product.currency)
      : `${formatMoney(min, product.currency)} – ${formatMoney(max, product.currency)}`;
  }
  const { min, max } = product.range ?? {};
  if (min != null && max != null) {
    return `${formatMoney(min, product.currency)} – ${formatMoney(max, product.currency)}`;
  }
  return 'Any amount';
}
