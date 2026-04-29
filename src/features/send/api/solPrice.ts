import { z } from 'zod';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

export const CoinGeckoSolPriceSchema = z.object({
  solana: z.object({
    usd: z.number().positive(),
  }),
});

export const solPriceQueries = {
  all: ['send', 'sol-price'] as const,
};

export async function fetchSolPrice(): Promise<number> {
  const res = await fetch(COINGECKO_URL);
  if (!res.ok) throw new Error(`SOL price fetch failed: ${res.status}`);
  const json = await res.json();
  const parsed = CoinGeckoSolPriceSchema.parse(json);
  return parsed.solana.usd;
}
