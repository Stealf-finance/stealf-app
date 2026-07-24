import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

/**
 * SOL/USD price — backend `/api/pricing/sol-price` (CoinGecko-backed, cached).
 * Authenticated (Turnkey session JWT). `apiGet` unwraps the `{ success, data }`
 * envelope and throws on non-200; on error React Query keeps the last value.
 */
export const SolPriceSchema = z.object({
  price_usd: z.number().positive(),
});

export const solPriceQueries = {
  all: ['solana', 'sol-price'] as const,
};

export async function fetchSolPrice(token: string): Promise<number> {
  const data = await apiGet('/api/pricing/sol-price', token);
  return SolPriceSchema.parse(data).price_usd;
}
