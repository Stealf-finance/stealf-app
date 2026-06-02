import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';
import { knownTokenByMint } from '@/src/constants/solana';

export const TokenBalanceSchema = z.object({
  tokenMint: z.string().nullable(),
  tokenSymbol: z.string(),
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

function applyKnownTokenMetadata(
  balance: z.infer<typeof BalanceResponseSchema>,
): z.infer<typeof BalanceResponseSchema> {
  return {
    ...balance,
    tokens: balance.tokens.map((t) => {
      const known = knownTokenByMint(t.tokenMint);
      if (!known) return t;
      return {
        ...t,
        tokenSymbol: known.symbol,
        tokenName: known.name,
        tokenDecimals: known.decimals,
        tokenIcon: t.tokenIcon ?? known.iconUri ?? null,
      };
    }),
  };
}

export async function fetchBalance(token: string, address: string) {
  if (__DEV__) console.log('[bank/balance] fetch', address);
  const raw = await apiGet(`/api/wallet/balance/${address}`, token);
  const parsed = applyKnownTokenMetadata(BalanceResponseSchema.parse(raw));
  if (__DEV__)
    console.log(
      '[bank/balance] fetched',
      address,
      `$${parsed.totalUSD.toFixed(2)}`,
      `${parsed.tokens.length} tokens`,
    );
  return parsed;
}
