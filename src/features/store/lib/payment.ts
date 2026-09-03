import {
  PRIVATE_OP_SOL_FEE_RESERVE,
  toRawAmount,
} from '@/src/features/send/lib/amount';

/** The backend credits ONE mint — its treasury USDC ETA. See STORE.md. */
const SETTLEMENT_SYMBOLS = ['USDC', 'dUSDC'] as const;

/** Dev-only last resort: a devnet wallet holds faucet SOL and no stablecoin. */
const NATIVE_FALLBACK_SYMBOL = 'SOL';

/** Flat charge on the SOL path — a €25 card must never mean 25 SOL. */
export const DEV_SOL_TEST_AMOUNT = 0.2;

export type PaymentToken = {
  mint: string;
  symbol: string;
  decimals: number;
  amountRaw: bigint;
};

/** The mint is read off the balance, never hard-coded: devnet and mainnet
 *  disagree and a stale constant would send to a token nobody holds. */
export function resolvePaymentToken<T extends PaymentToken>(
  tokens: readonly T[] | undefined,
  { allowNative = false }: { allowNative?: boolean } = {},
): T | undefined {
  if (!tokens) return undefined;
  const order: readonly string[] = allowNative
    ? [...SETTLEMENT_SYMBOLS, NATIVE_FALLBACK_SYMBOL]
    : SETTLEMENT_SYMBOLS;
  for (const symbol of order) {
    const hit = tokens.find((t) => t.symbol === symbol);
    if (hit) return hit;
  }
  return undefined;
}

/** True when the resolved token is the dev SOL fallback, not a stablecoin. */
export function isNativeTestToken(token: PaymentToken): boolean {
  return token.symbol === NATIVE_FALLBACK_SYMBOL;
}

/** What the SOL path actually sends — never the card price. */
export function devNativeAmountRaw(token: PaymentToken): bigint {
  return toRawAmount(DEV_SOL_TEST_AMOUNT, token.decimals);
}

/**
 * What the swipe is gated on. The dev SOL path pays its flat amount; every
 * other path waits for the order's quote, because the catalogue carries
 * Bitrefill's partner cost and never the user's USDC price. See STORE.md,
 * "Two different currencies".
 */
export function requiredAmountRaw(
  token: PaymentToken,
  quotedRaw: bigint | undefined,
): bigint | undefined {
  return isNativeTestToken(token) ? devNativeAmountRaw(token) : quotedRaw;
}

export type PaymentBlocker =
  | 'signer'
  | 'stock'
  | 'token'
  | 'balance'
  | 'fee'
  | null;

export function resolvePaymentBlocker(input: {
  signerReady: boolean;
  inStock: boolean;
  token: PaymentToken | undefined;
  requiredRaw: bigint | undefined;
  publicSol: number;
}): PaymentBlocker {
  if (!input.signerReady) return 'signer';
  if (!input.inStock) return 'stock';
  if (!input.token) return 'token';
  // An unquoted amount gates nothing — the order response is re-checked
  // against the balance before anything is transferred.
  if (
    input.requiredRaw !== undefined &&
    input.token.amountRaw < input.requiredRaw
  ) {
    return 'balance';
  }
  if (input.publicSol < PRIVATE_OP_SOL_FEE_RESERVE) return 'fee';
  return null;
}
