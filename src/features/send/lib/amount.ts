export const SOL_DECIMALS = 9;

/**
 * SOL reserve subtracted from a wallet's balance when offering "Max" — covers
 * the worst-case priority + base fee for an Umbra-class transaction (proof
 * verification, Arcium MPC) so the tx doesn't fail at submit time. Only
 * applied when the source wallet is also the fee payer; for ops where fees
 * come from a different bucket (e.g. encrypted-balance withdrawals paid out
 * of the stealth public ATA), the full balance can be spent.
 */
export const SOL_FEE_RESERVE = 0.01;

export function maxSpendableSol(balance: number, sourcePaysFees: boolean): number {
  if (!sourcePaysFees) return balance;
  return Math.max(0, balance - SOL_FEE_RESERVE);
}

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
