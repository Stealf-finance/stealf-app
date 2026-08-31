import { describe, it, expect } from 'vitest';
import {
  CATEGORY_ORDER,
  STORE_CATALOG,
  filterByCategories,
  groupByCategory,
  searchCatalog,
} from '../catalog';
import { FEATURED_PRODUCT_IDS, resolveFeatured } from '../featured';
import { STORE_CATEGORIES } from '../types';
import type { StoreProduct } from '../types';

const product = (over: Partial<StoreProduct> = {}): StoreProduct => ({
  id: 'x',
  name: 'X',
  currency: 'EUR',
  inStock: true,
  packages: [],
  category: 'retail',
  ...over,
});

describe('STORE_CATALOG', () => {
  it('carries no duplicate product ids', () => {
    const ids = STORE_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only uses categories the backend accepts', () => {
    for (const p of STORE_CATALOG) {
      expect(STORE_CATEGORIES).toContain(p.category);
    }
  });

  it('gives every product either packages or a range', () => {
    for (const p of STORE_CATALOG) {
      expect(p.packages.length > 0 || p.range != null).toBe(true);
    }
  });

  it('places every product in a category the sections render', () => {
    for (const p of STORE_CATALOG) {
      expect(CATEGORY_ORDER).toContain(p.category);
    }
  });

  it('resolves enough curated ids to fill the Best Selling rail', () => {
    const featured = resolveFeatured(STORE_CATALOG, FEATURED_PRODUCT_IDS);
    expect(featured.length).toBeGreaterThanOrEqual(4);
  });
});

describe('groupByCategory', () => {
  it('returns sections in the configured order', () => {
    const out = groupByCategory([
      product({ id: 'a', category: 'streaming' }),
      product({ id: 'b', category: 'retail' }),
    ]);
    expect(out.map((s) => s.category)).toEqual(['retail', 'streaming']);
  });

  it('drops categories left with no products', () => {
    const out = groupByCategory([product({ category: 'retail' })]);
    expect(out).toHaveLength(1);
  });

  it('returns nothing for an empty catalog', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

describe('searchCatalog', () => {
  const catalog = [
    product({ id: 'a', name: 'Netflix' }),
    product({ id: 'b', name: 'Deliveroo' }),
    product({ id: 'c', name: 'Décathlon' }),
  ];

  it('matches on a partial name, ignoring case', () => {
    expect(searchCatalog(catalog, 'net').map((p) => p.id)).toEqual(['a']);
  });

  it('matches an accented name typed without accents', () => {
    expect(searchCatalog(catalog, 'decathlon').map((p) => p.id)).toEqual(['c']);
  });

  it('returns the whole catalog for a blank query', () => {
    expect(searchCatalog(catalog, '   ')).toHaveLength(3);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchCatalog(catalog, 'zzz')).toEqual([]);
  });
});

describe('filterByCategories', () => {
  const catalog = [
    product({ id: 'a', category: 'retail' }),
    product({ id: 'b', category: 'games' }),
  ];

  it('treats an empty selection as no filter', () => {
    expect(filterByCategories(catalog, [])).toHaveLength(2);
  });

  it('keeps only the selected categories', () => {
    expect(filterByCategories(catalog, ['games']).map((p) => p.id)).toEqual(['b']);
  });
});
