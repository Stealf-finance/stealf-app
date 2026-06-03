/** Pure formatting for a claim's one-line label. No app/SDK imports so it stays
 *  unit-testable; the caller resolves the sender/mint and token metadata. */

export type ClaimToken = {
  symbol: string;
  decimals: number;
  /** USD value of one whole token (1 for stablecoins, live price for SOL).
   *  null when unknown — then the raw token amount is shown without a $ value. */
  usdPerUnit: number | null;
};

export function shortAddress(a: string | null | undefined): string | null {
  if (!a) return null;
  return a.length <= 10 ? a : `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function rawToHuman(
  amountRaw: bigint | string | number | null | undefined,
  decimals: number,
): number | null {
  if (amountRaw == null) return null;
  try {
    return Number(BigInt(amountRaw as never)) / 10 ** decimals;
  } catch {
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n / 10 ** decimals : null;
  }
}

/**
 * Builds the concatenated claim label, e.g. `7f3a…2e9b · $12.50 dUSDC`.
 * Only the parts that resolve are included; if nothing resolves it falls back
 * to "Encrypted to bank".
 */
export function describeClaimLine(args: {
  sender: string | null | undefined;
  token: ClaimToken | null;
  amountRaw: bigint | string | number | null | undefined;
}): string {
  const sender = shortAddress(args.sender);

  let valuePart: string | null = null;
  if (args.token) {
    const { symbol, decimals, usdPerUnit } = args.token;
    const human = rawToHuman(args.amountRaw, decimals);
    if (human != null && Number.isFinite(human)) {
      if (usdPerUnit != null) {
        const usd = (human * usdPerUnit).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        valuePart = `$${usd} ${symbol}`;
      } else {
        const amt = human.toLocaleString('en-US', { maximumFractionDigits: 4 });
        valuePart = `${amt} ${symbol}`;
      }
    } else {
      valuePart = symbol;
    }
  }

  const parts = [sender, valuePart].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' · ') : 'Encrypted to bank';
}
