import {
  PRIVATE_OP_SOL_FEE_RESERVE,
  toRawAmount,
} from '@/src/features/send/lib/amount';
import type { Denomination } from './denominations';

/** Stealf's Umbra-registered treasury — the backend's `AUTHORITY_PUBLIC_KEY`. */
export const STORE_TREASURY_ADDRESS =
  'FpRVZrZ7zAigWG4mGMirCJMibxedQ4DmMcQCo3p94nwF';

/** Settlement token, best first — devnet mints carry the `d` prefix. */
const SETTLEMENT_SYMBOLS = ['USDC', 'dUSDC', 'USDT', 'dUSDT'] as const;

/** Dev-only last resort: a devnet wallet holds SOL and no stablecoin. */
const NATIVE_FALLBACK_SYMBOL = 'SOL';

/** Flat amount charged when paying in SOL. A card's face value in SOL would
 *  be absurd and unaffordable — this path exists to exercise the transfer. */
export const DEV_SOL_TEST_AMOUNT = 0.001;

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

/** What the buyer is actually charged, in whole units of `token`. */
export function paymentHumanAmount(
  amount: Denomination,
  token: PaymentToken,
): number {
  return isNativeTestToken(token) ? DEV_SOL_TEST_AMOUNT : amount.unitPrice;
}

/** Face value is charged 1:1 in the settlement token. See STORE.md. */
export function paymentAmountRaw(
  amount: Denomination,
  token: PaymentToken,
): bigint {
  return toRawAmount(paymentHumanAmount(amount, token), token.decimals);
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
  if (!input.token || input.requiredRaw === undefined) return 'token';
  if (input.token.amountRaw < input.requiredRaw) return 'balance';
  if (input.publicSol < PRIVATE_OP_SOL_FEE_RESERVE) return 'fee';
  return null;
}
