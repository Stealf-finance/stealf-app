import { describe, it, expect } from 'vitest';
import { clampIndex, denominations, nearestIndex } from '../denominations';
import type { StoreProduct } from '../../api/curated';

const product = (values: (number | string)[]): StoreProduct => ({
  id: 'x',
  name: 'X',
  currency: 'EUR',
  inStock: true,
  packages: values.map((v) => ({ packageId: `p${v}`, value: v })),
  group: 'ecommerce',
});

describe('denominations', () => {
  it('sorts ascending — Amazon comes back descending', () => {
    const out = denominations(product([1000, 500, 200, 100, 50, 25]));
    expect(out.map((d) => d.value)).toEqual([25, 50, 100, 200, 500, 1000]);
  });

  it('coerces the string values Bitrefill sends', () => {
    expect(denominations(product(['50', 25])).map((d) => d.value)).toEqual([
      25, 50,
    ]);
  });

  it('drops duplicates, keeping the first packageId', () => {
    const out = denominations(product([25, 25]));
    expect(out).toHaveLength(1);
    expect(out[0].packageId).toBe('p25');
  });

  it('drops non-positive and unparseable values', () => {
    expect(denominations(product([0, -5, 'abc', 25]))).toHaveLength(1);
  });

  it("carries the face value only — the USDC charge is the order's to quote", () => {
    expect(denominations(product([25]))[0]).toEqual({
      packageId: 'p25',
      value: 25,
    });
  });

  it('returns nothing for a product with neither packages nor a range', () => {
    expect(denominations(product([]))).toEqual([]);
  });

  it('proposes steps for an open-amount product so it is still buyable', () => {
    const open = { ...product([]), range: { min: 10, max: 500, step: 5 } };
    const out = denominations(open);
    expect(out.length).toBeGreaterThan(1);
    expect(out[0].value).toBe(10);
    expect(out[out.length - 1].value).toBe(500);
  });

  it('leaves a range-derived value without a packageId', () => {
    const open = { ...product([]), range: { min: 10, max: 500, step: 5 } };
    expect(denominations(open)[0].packageId).toBeUndefined();
  });

  it('keeps every range step on the step grid', () => {
    const open = { ...product([]), range: { min: 10, max: 500, step: 5 } };
    for (const d of denominations(open)) {
      expect(Math.round((d.value - 10) * 100) % 500).toBe(0);
    }
  });
});

describe('clampIndex', () => {
  it('keeps the index inside the list', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
  });

  it('is safe on an empty list', () => {
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe('nearestIndex', () => {
  const list = denominations(product([25, 50, 100]));

  it('finds an exact value', () => {
    expect(nearestIndex(list, 50)).toBe(1);
  });

  it('falls back to the closest when the value is gone', () => {
    expect(nearestIndex(list, 60)).toBe(1);
    expect(nearestIndex(list, 90)).toBe(2);
  });

  it('is safe on an empty list', () => {
    expect(nearestIndex([], 50)).toBe(0);
  });
});
