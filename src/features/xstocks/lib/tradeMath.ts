import { USDC_DECIMALS } from '@/src/constants/solana';

/** USDC (human dollars) → integer base units. Rejects non-positive / non-finite. */
export function usdcToBaseUnits(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(`Invalid USDC amount: ${usd}`);
  }
  return Math.floor(usd * 10 ** USDC_DECIMALS);
}

/**
 * Raw Token-2022 base units to sell for a desired scaled share amount, derived
 * proportionally from the current holding (`rawBaseUnitsHeld` ↔ `uiAmountHeld`).
 *
 * Selling the whole holding returns exactly `rawBaseUnitsHeld` (no rounding
 * drift that could leave dust or overshoot). Never scale `uiAmount` directly —
 * the backend build-sell wants raw base units. Returns 0 for invalid inputs.
 */
export function sellRawBaseUnits(
  sharesToSell: number,
  uiAmountHeld: number,
  rawBaseUnitsHeld: number,
): number {
  if (!(uiAmountHeld > 0) || !(rawBaseUnitsHeld > 0) || !(sharesToSell > 0)) {
    return 0;
  }
  if (sharesToSell >= uiAmountHeld) return rawBaseUnitsHeld;
  return Math.floor(rawBaseUnitsHeld * (sharesToSell / uiAmountHeld));
}
