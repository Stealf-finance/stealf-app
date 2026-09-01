import { describe, it, expect } from 'vitest';
import { findProduct, flattenGroups, searchCatalog } from '../catalog';
import type { StoreGroupSection, StoreProduct } from '../../api/curated';

const product = (over: Partial<StoreProduct> = {}): StoreProduct => ({
  id: 'x',
  name: 'X',
  currency: 'EUR',
  inStock: true,
  packages: [],
  group: 'ecommerce',
  ...over,
});

const section = (
  group: StoreGroupSection['group'],
  products: StoreProduct[],
): StoreGroupSection => ({ group, products });

const groups: StoreGroupSection[] = [
  section('ecommerce', [product({ id: 'amazon', name: 'Amazon' })]),
  section('gaming', [
    product({ id: 'steam', name: 'Steam' }),
    product({ id: 'xbox', name: 'Xbox', inStock: false }),
  ]),
];

describe('flattenGroups', () => {
  it('returns every product in section order', () => {
    expect(flattenGroups(groups).map((p) => p.id)).toEqual([
      'amazon',
      'steam',
      'xbox',
    ]);
  });

  it('treats a catalog that has not loaded as empty', () => {
    expect(flattenGroups(undefined)).toEqual([]);
  });
});

describe('findProduct', () => {
  it('resolves an id across groups', () => {
    expect(findProduct(groups, 'xbox')?.name).toBe('Xbox');
  });

  it('returns undefined for an unknown id', () => {
    expect(findProduct(groups, 'nope')).toBeUndefined();
  });

  it('returns undefined before the catalog loads', () => {
    expect(findProduct(undefined, 'amazon')).toBeUndefined();
  });
});

describe('searchCatalog', () => {
  const catalog = [
    product({ id: 'a', name: 'Netflix' }),
    product({ id: 'b', name: 'Just Eat' }),
    product({ id: 'c', name: 'Décathlon' }),
  ];

  it('matches on a partial name, ignoring case', () => {
    expect(searchCatalog(catalog, 'net').map((p) => p.id)).toEqual(['a']);
  });

  it('matches an accented name typed without accents', () => {
    expect(searchCatalog(catalog, 'decathlon').map((p) => p.id)).toEqual(['c']);
  });

  it('returns everything for a blank query', () => {
    expect(searchCatalog(catalog, '   ')).toHaveLength(3);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchCatalog(catalog, 'zzz')).toEqual([]);
  });

  it('matches the shortened name shown on the tile', () => {
    const amazon = [product({ id: 'z', name: 'Amazon.co.uk United Kingdom' })];
    expect(searchCatalog(amazon, 'amazon uk').map((p) => p.id)).toEqual(['z']);
  });

  it('still matches the full name the API returned', () => {
    const amazon = [product({ id: 'z', name: 'Amazon.co.uk United Kingdom' })];
    expect(searchCatalog(amazon, 'united kingdom').map((p) => p.id)).toEqual([
      'z',
    ]);
  });
});
