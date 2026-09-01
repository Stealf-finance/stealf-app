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

  it('keeps a missing balance unknown instead of calling it zero', () => {
    const r = aggregateHomeBalances({ bank: { totalUSD: 100 } });
    expect(r.bankUSD).toBe(100);
    expect(r.encryptedUSD).toBeUndefined();
  });

  it('withholds the total until both sides are in', () => {
    // 100 is not the total, it's half of it — showing it would jump later.
    expect(aggregateHomeBalances({ bank: { totalUSD: 100 } }).totalUSD).toBeUndefined();
    expect(
      aggregateHomeBalances({ encrypted: { totalUSD: 5 } }).totalUSD,
    ).toBeUndefined();
  });

  it('is unknown, not 0, when everything is null/undefined', () => {
    const r = aggregateHomeBalances({ bank: null, encrypted: null });
    expect(r.totalUSD).toBeUndefined();
    expect(r.bankUSD).toBeUndefined();
    expect(r.encryptedUSD).toBeUndefined();
  });

  it('treats a genuine zero as a known value', () => {
    const r = aggregateHomeBalances({
      bank: { totalUSD: 0 },
      encrypted: { totalUSD: 0 },
    });
    expect(r).toEqual({ bankUSD: 0, encryptedUSD: 0, totalUSD: 0 });
  });
});
