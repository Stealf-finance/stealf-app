import { describe, it, expect } from 'vitest';
import {
  currencySymbol,
  denominationSummary,
  formatMoney,
  packageValue,
  unitPriceOf,
} from '../format';
import type { StoreProduct } from '../../api/curated';

const product = (over: Partial<StoreProduct> = {}): StoreProduct => ({
  id: 'x',
  name: 'X',
  currency: 'EUR',
  inStock: true,
  packages: [],
  group: 'ecommerce',
  ...over,
});

describe('formatMoney', () => {
  it('drops the cents on a whole amount', () => {
    expect(formatMoney(25, 'EUR')).toBe('€25');
  });

  it('keeps two decimals when there are cents', () => {
    expect(formatMoney(25.5, 'EUR')).toBe('€25.50');
  });

  it('falls back to the raw code for an unmapped currency', () => {
    expect(formatMoney(25, 'SEK')).toBe('25 SEK');
  });

  it('renders a bare number when no currency is known', () => {
    expect(formatMoney(25)).toBe('25');
  });
});

describe('currencySymbol', () => {
  it('maps the currencies the Store sells in', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('USD')).toBe('$');
  });
});

describe('packageValue', () => {
  it('accepts the numeric form', () => {
    expect(packageValue({ packageId: 'a', value: 25 })).toBe(25);
  });

  it('coerces the string form Bitrefill also documents', () => {
    expect(packageValue({ packageId: 'a', value: '25' })).toBe(25);
  });

  it('degrades to zero rather than NaN on junk', () => {
    expect(packageValue({ packageId: 'a', value: 'abc' })).toBe(0);
  });
});

describe('unitPriceOf', () => {
  it('prefers the partner price when Bitrefill sends one', () => {
    expect(unitPriceOf({ packageId: 'a', value: 25, price: 24 })).toBe(24);
  });

  it('sells at face value when no price is quoted', () => {
    expect(unitPriceOf({ packageId: 'a', value: 25 })).toBe(25);
  });
});

describe('denominationSummary', () => {
  it('shows fixed denominations as a range', () => {
    const p = product({
      packages: [
        { packageId: 'a', value: 25 },
        { packageId: 'b', value: 50 },
      ],
    });
    expect(denominationSummary(p)).toBe('€25 – €50');
  });

  it('takes the bounds, not the ends — Bitrefill does not sort packages', () => {
    const p = product({
      packages: [1000, 200, 500].map((v) => ({
        packageId: `p${v}`,
        value: v,
      })),
    });
    expect(denominationSummary(p)).toBe('€200 – €1000');
  });

  it('shows a single denomination once, not as a range', () => {
    const p = product({ packages: [{ packageId: 'a', value: 25 }] });
    expect(denominationSummary(p)).toBe('€25');
  });

  it('shows the bounds of a ranged product', () => {
    const p = product({ range: { min: 10, max: 500, step: 5 } });
    expect(denominationSummary(p)).toBe('€10 – €500');
  });

  it('falls back when a product has neither', () => {
    expect(denominationSummary(product())).toBe('Any amount');
  });
});
