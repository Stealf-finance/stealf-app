import { describe, expect, it } from 'vitest';
import { poolConversionRate, solToLamports } from '../poolMath';

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
