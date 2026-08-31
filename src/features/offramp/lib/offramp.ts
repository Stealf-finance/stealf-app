import type { SellChannel } from '../api/offramp';

/** Total fee of a channel as a number, or +Infinity if not quotable. */
function feeOf(c: SellChannel): number {
  const t = c.Calculated?.TotalFee ?? c.FeeConfig?.Fixed;
  const n = t != null ? Number(t) : NaN;
  return Number.isFinite(n) ? n : Infinity;
}

/**
 * Pick the cheapest usable sell channel for a fiat currency. Noah returns many
 * (SEPA, faster-payments, card…); prefer the lowest total fee, breaking ties by
 * fastest processing. Returns null when none match.
 */
export function pickBestChannel(
  channels: SellChannel[],
  fiatCurrency?: string,
): SellChannel | null {
  const usable = channels.filter(
    (c) => !fiatCurrency || c.FiatCurrency === fiatCurrency,
  );
  if (usable.length === 0) return null;
  return [...usable].sort((a, b) => {
    const fa = feeOf(a);
    const fb = feeOf(b);
    if (fa !== fb) return fa - fb;
    return (a.ProcessingSeconds ?? Infinity) - (b.ProcessingSeconds ?? Infinity);
  })[0];
}

/** Is a fiat amount within a channel's min/max limits? */
export function isWithinLimits(
  channel: SellChannel,
  fiatAmount: number,
): boolean {
  if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) return false;
  const min = channel.Limits?.MinLimit ? Number(channel.Limits.MinLimit) : 0;
  const max = channel.Limits?.MaxLimit ? Number(channel.Limits.MaxLimit) : Infinity;
  return fiatAmount >= min && fiatAmount <= max;
}

/**
 * Slippage floor for the deposit rule: the minimum USDC Noah must receive to
 * honor the quote. `estimate` is the quoted crypto amount (decimal string); we
 * shave `slippageBps` and trim to 6dp (USDC), dropping any trailing zeros.
 */
export function computeMinCryptoAmount(
  estimate: string | undefined,
  slippageBps: number,
): string | undefined {
  if (!estimate) return undefined;
  const n = Number(estimate);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const floor = n * (1 - slippageBps / 10_000);
  if (!Number.isFinite(floor) || floor <= 0) return undefined;
  return floor.toFixed(6).replace(/\.?0+$/, '');
}
