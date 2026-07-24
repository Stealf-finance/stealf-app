import { LAMPORTS_PER_SOL } from '../solana/kit';

/** SOL backing one JitoSOL (pool exchange rate). 0 for an empty pool. */
export function poolConversionRate(
  totalLamports: bigint,
  poolTokenSupply: bigint,
): number {
  if (poolTokenSupply === 0n) return 0;
  return Number(totalLamports) / Number(poolTokenSupply);
}

/** SOL → integer lamports (floored). Rejects non-positive / non-finite. */
export function solToLamports(sol: number): number {
  if (!Number.isFinite(sol) || sol <= 0) {
    throw new Error(`Invalid SOL amount: ${sol}`);
  }
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Solana mainnet epochs run ~2 days, so ~182/year. Used to annualise a single
 * epoch's exchange-rate gain. It's an approximation — real epoch length drifts
 * with skipped slots — kept as one named constant so it's easy to tune.
 */
export const EPOCHS_PER_YEAR = 182;

/**
 * Estimated JitoSOL staking APY, derived purely from the pool's exchange-rate
 * change between last epoch and now, compounded over {@link EPOCHS_PER_YEAR}.
 * Returns a fraction (0.08 = 8%), or `null` when either epoch's pool is empty
 * (no rate to compare). This is a noisy single-epoch estimate — not Jito's
 * published APY. Can be negative if the rate fell (slashing / measurement noise).
 */
export function estimateStakePoolApy(pool: {
  totalLamports: bigint;
  poolTokenSupply: bigint;
  lastEpochTotalLamports: bigint;
  lastEpochPoolTokenSupply: bigint;
}): number | null {
  const current = poolConversionRate(pool.totalLamports, pool.poolTokenSupply);
  const last = poolConversionRate(
    pool.lastEpochTotalLamports,
    pool.lastEpochPoolTokenSupply,
  );
  if (!(current > 0) || !(last > 0)) return null;

  const epochGrowth = current / last;
  if (!Number.isFinite(epochGrowth) || epochGrowth <= 0) return null;

  return epochGrowth ** EPOCHS_PER_YEAR - 1;
}
