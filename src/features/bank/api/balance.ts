import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

export const TokenBalanceSchema = z.object({
  tokenMint: z.string().nullable(),
  tokenSymbol: z.string(),
  // Optional for back-compat with stale caches that predate the metadata
  // expansion — drops out cleanly to fallback behavior on the frontend.
  tokenName: z.string().optional(),
  tokenIcon: z.string().nullable().optional(),
  tokenDecimals: z.number(),
  balance: z.number(),
  balanceUSD: z.number(),
});

export const BalanceResponseSchema = z.object({
  address: z.string(),
  tokens: z.array(TokenBalanceSchema),
  totalUSD: z.number(),
});

export const balanceQueries = {
  byAddress: (address: string) => ['wallet-balance', address] as const,
};

export async function fetchBalance(token: string, address: string) {
  if (__DEV__) console.log('[bank/balance] fetch', address);
  const raw = await apiGet(`/api/wallet/balance/${address}`, token);
  const parsed = BalanceResponseSchema.parse(raw);
  if (__DEV__)
    console.log(
      '[bank/balance] fetched',
      address,
      `$${parsed.totalUSD.toFixed(2)}`,
      `${parsed.tokens.length} tokens`,
    );
  return parsed;
}
