import { describe, expect, it } from 'vitest';
import { JitoStatsSchema } from '../api/jitoApy';

describe('JitoStatsSchema', () => {
  it('parses the Jito stake-pool apy series (fractions; latest × 100 = percent)', () => {
    const parsed = JitoStatsSchema.parse({
      apy: [{ data: 0.07 }, { data: 0.078 }],
      // real payload carries more keys (tvl, supply…) — they're ignored
      tvl: [{ data: 1 }],
    });
    const latest = parsed.apy[parsed.apy.length - 1].data;
    expect(latest * 100).toBeCloseTo(7.8, 5);
  });

  it('rejects an empty or malformed apy series', () => {
    expect(() => JitoStatsSchema.parse({ apy: [] })).toThrow();
    expect(() => JitoStatsSchema.parse({})).toThrow();
    expect(() => JitoStatsSchema.parse({ apy: [{ data: '7' }] })).toThrow();
  });
});
