import { describe, it, expect } from 'vitest';
import {
  pickBestChannel,
  isWithinLimits,
  computeMinCryptoAmount,
} from '../offramp';
import type { SellChannel } from '../../api/offramp';

const chan = (over: Partial<SellChannel>): SellChannel =>
  ({ ID: 'c', FiatCurrency: 'EUR', ...over }) as SellChannel;

describe('pickBestChannel', () => {
  it('returns null when nothing matches the fiat currency', () => {
    expect(pickBestChannel([chan({ FiatCurrency: 'USD' })], 'EUR')).toBeNull();
    expect(pickBestChannel([], 'EUR')).toBeNull();
  });

  it('prefers the lowest total fee', () => {
    const cheap = chan({ ID: 'cheap', Calculated: { TotalFee: '1.50' } });
    const pricey = chan({ ID: 'pricey', Calculated: { TotalFee: '4.00' } });
    expect(pickBestChannel([pricey, cheap], 'EUR')?.ID).toBe('cheap');
  });

  it('breaks fee ties by fastest processing', () => {
    const slow = chan({ ID: 'slow', Calculated: { TotalFee: '2' }, ProcessingSeconds: 86400 });
    const fast = chan({ ID: 'fast', Calculated: { TotalFee: '2' }, ProcessingSeconds: 10 });
    expect(pickBestChannel([slow, fast], 'EUR')?.ID).toBe('fast');
  });

  it('treats an unquotable fee as worst', () => {
    const quoted = chan({ ID: 'quoted', Calculated: { TotalFee: '5' } });
    const unknown = chan({ ID: 'unknown' });
    expect(pickBestChannel([unknown, quoted], 'EUR')?.ID).toBe('quoted');
  });
});

describe('isWithinLimits', () => {
  const c = chan({ Limits: { MinLimit: '10', MaxLimit: '1000' } });
  it('accepts inside the range', () => {
    expect(isWithinLimits(c, 10)).toBe(true);
    expect(isWithinLimits(c, 500)).toBe(true);
    expect(isWithinLimits(c, 1000)).toBe(true);
  });
  it('rejects outside the range or non-positive', () => {
    expect(isWithinLimits(c, 9)).toBe(false);
    expect(isWithinLimits(c, 1001)).toBe(false);
    expect(isWithinLimits(c, 0)).toBe(false);
    expect(isWithinLimits(c, NaN)).toBe(false);
  });
  it('treats a missing max as unbounded', () => {
    expect(isWithinLimits(chan({ Limits: { MinLimit: '5' } }), 10_000)).toBe(true);
  });
});

describe('computeMinCryptoAmount', () => {
  it('shaves the slippage and trims trailing zeros', () => {
    // 100 * (1 - 50/10000) = 99.5
    expect(computeMinCryptoAmount('100', 50)).toBe('99.5');
    // whole result collapses to an integer string
    expect(computeMinCryptoAmount('100', 0)).toBe('100');
  });
  it('returns undefined for bad input', () => {
    expect(computeMinCryptoAmount(undefined, 50)).toBeUndefined();
    expect(computeMinCryptoAmount('0', 50)).toBeUndefined();
    expect(computeMinCryptoAmount('abc', 50)).toBeUndefined();
  });
});
