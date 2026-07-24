import { describe, expect, it } from 'vitest';
import {
  EPOCHS_PER_YEAR,
  estimateStakePoolApy,
  poolConversionRate,
  solToLamports,
} from '../poolMath';

describe('poolConversionRate', () => {
  it('returns SOL per JitoSOL from pool totals', () => {
    // 1.2M SOL staked backing 1M pool tokens → 1 JitoSOL = 1.2 SOL
    expect(
      poolConversionRate(1_200_000_000_000_000n, 1_000_000_000_000_000n),
    ).toBeCloseTo(1.2, 9);
  });

  it('returns 0 when the pool token supply is zero', () => {
    expect(poolConversionRate(500n, 0n)).toBe(0);
  });

  it('handles a fresh 1:1 pool', () => {
    expect(poolConversionRate(1_000n, 1_000n)).toBe(1);
  });
});

describe('solToLamports', () => {
  it('converts SOL to integer lamports (floor)', () => {
    expect(solToLamports(1.5)).toBe(1_500_000_000);
    expect(solToLamports(0.000000001)).toBe(1);
  });

  it('floors sub-lamport dust', () => {
    expect(solToLamports(0.0000000019)).toBe(1);
  });

  it('rejects zero, negative and non-finite amounts', () => {
    expect(() => solToLamports(0)).toThrow();
    expect(() => solToLamports(-1)).toThrow();
    expect(() => solToLamports(Number.NaN)).toThrow();
    expect(() => solToLamports(Infinity)).toThrow();
  });
});

describe('estimateStakePoolApy', () => {
  // A rate that grew from `last` to `current` over one epoch, compounded over a
  // year. Fraction (0.08 = 8%). Derives APY from the on-chain exchange rate
  // delta only — a noisy single-epoch estimate, not Jito's published figure.
  const grew = (currentRate: number, lastRate: number) =>
    estimateStakePoolApy({
      totalLamports: BigInt(Math.round(currentRate * 1e12)),
      poolTokenSupply: 1_000_000_000_000n,
      lastEpochTotalLamports: BigInt(Math.round(lastRate * 1e12)),
      lastEpochPoolTokenSupply: 1_000_000_000_000n,
    });

  it('returns 0 when the rate did not move over the epoch', () => {
    expect(grew(1.05, 1.05)).toBe(0);
  });

  it('annualises one epoch of growth by compounding over EPOCHS_PER_YEAR', () => {
    const current = 1.0004228;
    const last = 1.0;
    const expected = (current / last) ** EPOCHS_PER_YEAR - 1;
    expect(grew(current, last)).toBeCloseTo(expected, 10);
    // ~0.04% per epoch compounds to a high-single-digit APY.
    expect(grew(current, last)).toBeGreaterThan(0.05);
    expect(grew(current, last)).toBeLessThan(0.12);
  });

  it('is monotonic — a bigger epoch gain yields a bigger APY', () => {
    expect(grew(1.001, 1.0)!).toBeGreaterThan(grew(1.0005, 1.0)!);
  });

  it('returns a negative estimate if the rate fell (slashing/noise)', () => {
    expect(grew(0.999, 1.0)!).toBeLessThan(0);
  });

  it('returns null when either epoch has an empty pool (no rate)', () => {
    expect(
      estimateStakePoolApy({
        totalLamports: 0n,
        poolTokenSupply: 0n,
        lastEpochTotalLamports: 1_000n,
        lastEpochPoolTokenSupply: 1_000n,
      }),
    ).toBeNull();
    expect(
      estimateStakePoolApy({
        totalLamports: 1_000n,
        poolTokenSupply: 1_000n,
        lastEpochTotalLamports: 0n,
        lastEpochPoolTokenSupply: 0n,
      }),
    ).toBeNull();
  });
});
