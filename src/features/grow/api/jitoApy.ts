import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

export const JitoApySchema = z.object({
  latestApy: z.number(),
});

export const jitoApyQueries = {
  all: ['grow', 'jito-apy'] as const,
};

export async function fetchJitoApy(token: string): Promise<number> {
  const data = await apiGet('/api/pricing/jito-apy', token);
  return JitoApySchema.parse(data).latestApy;
}
