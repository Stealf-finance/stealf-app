import { describe, expect, it } from 'vitest';
import { fromBaseUnits, toBaseUnits } from '../swapMath';

describe('toBaseUnits', () => {
  it('converts to exact base units without float drift', () => {
    expect(toBaseUnits(3.8916, 9)).toBe('3891600000');
    expect(toBaseUnits(10, 6)).toBe('10000000');
    expect(toBaseUnits(0.5, 6)).toBe('500000');
    expect(toBaseUnits(0.000001, 6)).toBe('1');
  });

  it('rejects zero, negative and non-finite amounts', () => {
    expect(() => toBaseUnits(0, 6)).toThrow();
    expect(() => toBaseUnits(-1, 6)).toThrow();
    expect(() => toBaseUnits(Number.NaN, 6)).toThrow();
  });
});

describe('fromBaseUnits', () => {
  it('converts base units back to a human amount', () => {
    expect(fromBaseUnits('3891600000', 9)).toBeCloseTo(3.8916, 9);
    expect(fromBaseUnits('10000000', 6)).toBe(10);
    expect(fromBaseUnits('1', 6)).toBeCloseTo(0.000001, 9);
  });

  it('returns 0 for non-finite input', () => {
    expect(fromBaseUnits('not-a-number', 6)).toBe(0);
  });
});
