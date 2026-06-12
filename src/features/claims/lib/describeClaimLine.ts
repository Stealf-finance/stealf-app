export type ClaimToken = {
  symbol: string;
  decimals: number;
  usdPerUnit: number | null;
  iconUri?: string | null;
};

export const CLAIM_FALLBACK_LABEL = 'Private transfer';

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
  return parts.length > 0 ? parts.join(' · ') : CLAIM_FALLBACK_LABEL;
}

/**
 * Structured breakdown for the claim row:
 *  - `sender`      → short sender address (null when unresolved)
 *  - `tokenAmount` → "2 SOL" (token amount + symbol), null when unresolved
 *  - `usdValue`    → "$120.33" (USD value), null when no price is known
 */
export function describeClaimParts(args: {
  sender: string | null | undefined;
  token: ClaimToken | null;
  amountRaw: bigint | string | number | null | undefined;
}): { sender: string | null; tokenAmount: string | null; usdValue: string | null } {
  const sender = shortAddress(args.sender);

  let tokenAmount: string | null = null;
  let usdValue: string | null = null;
  if (args.token) {
    const { symbol, decimals, usdPerUnit } = args.token;
    const human = rawToHuman(args.amountRaw, decimals);
    if (human != null && Number.isFinite(human)) {
      const amt = human.toLocaleString('en-US', { maximumFractionDigits: 4 });
      tokenAmount = `${amt} ${symbol}`;
      if (usdPerUnit != null) {
        const usd = (human * usdPerUnit).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        usdValue = `$${usd}`;
      }
    } else {
      tokenAmount = symbol;
    }
  }

  return { sender, tokenAmount, usdValue };
}
