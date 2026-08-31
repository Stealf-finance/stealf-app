import { z } from 'zod';

/**
 * JitoSOL staking APY, read directly from Jito's public stake-pool stats API.
 *
 * The backend `/api/pricing/jito-apy` route was removed with the private-yield
 * system, so the card/screen fell back to 0%. JitoSOL is a mainnet product, so
 * fetching the public mainnet stats works regardless of the app's cluster.
 *
 * `apy` is a time series of `{ data }` points (fractions, e.g. 0.078); the
 * latest × 100 is the APY percentage — same parsing the old backend used.
 */
const JITO_STATS_URL =
  'https://kobe.mainnet.jito.network/api/v1/stake_pool_stats';

export const JitoStatsSchema = z.object({
  apy: z.array(z.object({ data: z.number() })).min(1),
});

export const jitoApyQueries = {
  all: ['jito', 'jito-apy'] as const,
};

/** Latest JitoSOL staking APY as a percentage (e.g. 7.8). */
export async function fetchJitoApy(): Promise<number> {
  const res = await fetch(JITO_STATS_URL);
  if (!res.ok) throw new Error(`Jito stats HTTP ${res.status}`);
  const { apy } = JitoStatsSchema.parse(await res.json());
  return apy[apy.length - 1].data * 100;
}
