export const SOL_DECIMALS = 9;

/**
 * Apply a numpad keypress to the current amount string.
 *
 * - Caps fractional digits at `maxDecimals` (Solana's lamport precision is 9).
 * - Caps integer digits at 12 to keep the displayed amount readable and
 *   safely within Number-precision territory for fiat conversion.
 * - Treats '⌫' as backspace and '.' as a single-shot decimal insert.
 */
export function applyAmountKey(
  current: string,
  key: string,
  maxDecimals = SOL_DECIMALS,
): string {
  if (key === '⌫') return current.length > 1 ? current.slice(0, -1) : '0';
  if (key === '.') return current.includes('.') ? current : current + '.';

  const next = current === '0' ? key : current + key;
  const dotIdx = next.indexOf('.');

  if (dotIdx >= 0) {
    const fractional = next.length - dotIdx - 1;
    if (fractional > maxDecimals) return current;
  } else if (next.length > 12) {
    return current;
  }

  return next;
}
