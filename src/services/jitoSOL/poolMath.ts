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
