/** Money and denomination formatting for the Store. Pure. */
import type { StorePackage, StoreProduct } from './types';

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

/** What one card costs the user. Real pricing comes from Bitrefill's
 *  `price`; until then a card is sold at face value. */
export function unitPriceOf(pkg: StorePackage): number {
  return typeof pkg.price === 'number' ? pkg.price : packageValue(pkg);
}

/**
 * The one-line denomination summary under a product name:
 * fixed packages → "€25 · €50 · €100" (first three), ranged → "€10 – €500".
 */
export function denominationSummary(product: StoreProduct): string {
  if (product.packages.length > 0) {
    const shown = product.packages
      .slice(0, 3)
      .map((p) => formatMoney(packageValue(p), product.currency));
    const more = product.packages.length > 3 ? ' · …' : '';
    return shown.join(' · ') + more;
  }
  const { min, max } = product.range ?? {};
  if (min != null && max != null) {
    return `${formatMoney(min, product.currency)} – ${formatMoney(max, product.currency)}`;
  }
  return 'Any amount';
}
