import { describe, expect, it } from 'vitest';
import { sellRawBaseUnits, usdcToBaseUnits } from '../tradeMath';

describe('usdcToBaseUnits', () => {
  it('converts dollars to 6-decimal base units (floored)', () => {
    expect(usdcToBaseUnits(10)).toBe(10_000_000);
    expect(usdcToBaseUnits(1.234567)).toBe(1_234_567);
    expect(usdcToBaseUnits(0.0000019)).toBe(1);
  });

  it('rejects zero, negative and non-finite amounts', () => {
    expect(() => usdcToBaseUnits(0)).toThrow();
    expect(() => usdcToBaseUnits(-1)).toThrow();
    expect(() => usdcToBaseUnits(Number.NaN)).toThrow();
  });
});

describe('sellRawBaseUnits', () => {
  // Holding: 1.5 shares (uiAmount) == 1_500_000 raw base units.
  const UI = 1.5;
  const RAW = 1_500_000;

  it('returns the exact raw balance when selling the whole holding', () => {
    expect(sellRawBaseUnits(1.5, UI, RAW)).toBe(RAW);
  });

  it('returns the exact raw balance when the input exceeds the holding', () => {
    expect(sellRawBaseUnits(99, UI, RAW)).toBe(RAW);
  });

  it('scales proportionally for a partial sell (floored)', () => {
    expect(sellRawBaseUnits(0.75, UI, RAW)).toBe(750_000);
    expect(sellRawBaseUnits(0.5, UI, RAW)).toBe(500_000);
  });

  it('returns 0 for invalid / empty inputs', () => {
    expect(sellRawBaseUnits(0, UI, RAW)).toBe(0);
    expect(sellRawBaseUnits(1, 0, RAW)).toBe(0);
    expect(sellRawBaseUnits(1, UI, 0)).toBe(0);
  });
});
