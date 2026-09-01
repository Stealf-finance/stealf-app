import { describe, it, expect } from 'vitest';
import { StoreGroupSectionSchema, StoreProductSchema } from '../curated';

const amazon = {
  id: 'amazon-uk',
  name: 'Amazon UK',
  country: 'GB',
  currency: 'GBP',
  image: 'https://example.test/amazon.png',
  inStock: true,
  packages: [
    { packageId: 'amazon-uk<&>25', value: 25 },
    { packageId: 'amazon-uk<&>50', value: '50' },
  ],
  group: 'ecommerce',
};

describe('StoreProductSchema', () => {
  it('parses a fixed-denomination product', () => {
    const out = StoreProductSchema.parse(amazon);
    expect(out.packages).toHaveLength(2);
    expect(out.currency).toBe('GBP');
  });

  it('keeps a package value as the string Bitrefill sent', () => {
    expect(StoreProductSchema.parse(amazon).packages[1].value).toBe('50');
  });

  it('parses a ranged product with no packages', () => {
    const out = StoreProductSchema.parse({
      id: 'ranged',
      name: 'Ranged',
      inStock: true,
      packages: [],
      range: { min: 10, max: 500, step: 5 },
      group: 'food',
    });
    expect(out.range).toEqual({ min: 10, max: 500, step: 5 });
  });

  it('defaults a missing packages key rather than failing the parse', () => {
    const { packages: _dropped, ...noPackages } = amazon;
    expect(StoreProductSchema.parse(noPackages).packages).toEqual([]);
  });

  it('tolerates unknown fields the backend may add', () => {
    expect(() =>
      StoreProductSchema.parse({ ...amazon, somethingNew: true }),
    ).not.toThrow();
  });

  it('rejects a group outside the contract', () => {
    expect(() =>
      StoreProductSchema.parse({ ...amazon, group: 'retail' }),
    ).toThrow();
  });

  it('rejects a product with no inStock flag', () => {
    const { inStock: _dropped, ...noStock } = amazon;
    expect(() => StoreProductSchema.parse(noStock)).toThrow();
  });
});

describe('StoreGroupSectionSchema', () => {
  it('parses a section', () => {
    const out = StoreGroupSectionSchema.parse({
      group: 'ecommerce',
      products: [amazon],
    });
    expect(out.products[0].id).toBe('amazon-uk');
  });

  it('accepts a section the backend emptied', () => {
    expect(
      StoreGroupSectionSchema.parse({ group: 'gaming', products: [] }).products,
    ).toEqual([]);
  });
});
