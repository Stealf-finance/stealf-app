import { describe, expect, it } from 'vitest';
import { aggregateHomeBalances } from '../aggregateHomeBalances';

describe('aggregateHomeBalances', () => {
  it('sums the two USD totals', () => {
    const r = aggregateHomeBalances({
      bank: { totalUSD: 100 },
      encrypted: { totalUSD: 5 },
    });
    expect(r).toEqual({ bankUSD: 100, encryptedUSD: 5, totalUSD: 105 });
  });
  it('treats missing balances as 0', () => {
    const r = aggregateHomeBalances({ bank: { totalUSD: 100 } });
    expect(r.totalUSD).toBe(100);
    expect(r.encryptedUSD).toBe(0);
  });
  it('is 0 when everything is null/undefined', () => {
    expect(aggregateHomeBalances({ bank: null, encrypted: null }).totalUSD).toBe(0);
  });
});
