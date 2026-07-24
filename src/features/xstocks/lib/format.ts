/** Shared xStock display formatters. */

export function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Drop the "xStock" brand suffix from a display name (Apple xStock → Apple). */
export function displayName(name: string): string {
  return name.replace(/\s*x-?stock\s*$/i, '').trim();
}

/** Token amount, trailing zeros trimmed (1.5000 → "1.5", 0 → "0"). */
export function formatAmount(n: number): string {
  if (n === 0) return '0';
  return n.toFixed(4).replace(/\.?0+$/, '');
}
