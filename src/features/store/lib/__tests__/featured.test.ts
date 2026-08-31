import { describe, it, expect } from 'vitest';
import { resolveFeatured } from '../featured';
import type { StoreProduct } from '../types';

const product = (id: string, over: Partial<StoreProduct> = {}): StoreProduct => ({
  id,
  name: id,
  currency: 'EUR',
  inStock: true,
  packages: [],
  category: 'retail',
  ...over,
});

describe('resolveFeatured', () => {
  const catalog = [product('amazon-fr'), product('netflix-fr'), product('zalando-fr')];

  it('returns the products in the order the curated list names them', () => {
    const out = resolveFeatured(catalog, ['zalando-fr', 'amazon-fr']);
    expect(out.map((p) => p.id)).toEqual(['zalando-fr', 'amazon-fr']);
  });

  it('skips ids the catalog does not carry', () => {
    const out = resolveFeatured(catalog, ['amazon-fr', 'gone-fr', 'netflix-fr']);
    expect(out.map((p) => p.id)).toEqual(['amazon-fr', 'netflix-fr']);
  });

  it('skips products that are out of stock', () => {
    const out = resolveFeatured(
      [product('amazon-fr', { inStock: false }), product('netflix-fr')],
      ['amazon-fr', 'netflix-fr'],
    );
    expect(out.map((p) => p.id)).toEqual(['netflix-fr']);
  });

  it('does not repeat a product listed twice', () => {
    const out = resolveFeatured(catalog, ['amazon-fr', 'amazon-fr']);
    expect(out).toHaveLength(1);
  });

  it('returns nothing when no curated id resolves', () => {
    expect(resolveFeatured(catalog, ['a', 'b'])).toEqual([]);
  });
});
