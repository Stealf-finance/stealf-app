import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

export const TokenBalanceSchema = z.object({
  tokenMint: z.string().nullable(),
  tokenSymbol: z.string(),
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
  byAddress: (address: string) => ['bank', 'balance', address] as const,
};

export async function fetchBalance(token: string, address: string) {
  const raw = await apiGet(`/api/wallet/balance/${address}`, token);
  return BalanceResponseSchema.parse(raw);
}
