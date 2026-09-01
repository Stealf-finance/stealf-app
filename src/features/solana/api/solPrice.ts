import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

export const SolPriceSchema = z.object({
  price_usd: z.number().positive(),
});

export const solPriceQueries = {
  all: ['sol-price'] as const,
};

export async function fetchSolPrice(token: string): Promise<number> {
  const data = await apiGet('/api/pricing/sol-price', token);
  return SolPriceSchema.parse(data).price_usd;
}
