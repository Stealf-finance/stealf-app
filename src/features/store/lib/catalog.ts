import type { StoreGroupSection, StoreProduct } from '../api/curated';
import { shortProductName } from './productName';

/** Every product across every group, in section order. */
export function flattenGroups(
  groups: readonly StoreGroupSection[] | undefined,
): StoreProduct[] {
  if (!groups) return [];
  return groups.flatMap((section) => section.products);
}

export function findProduct(
  groups: readonly StoreGroupSection[] | undefined,
  productId: string,
): StoreProduct | undefined {
  return flattenGroups(groups).find((p) => p.id === productId);
}

/** Matches the full and shortened names, case- and accent-insensitive. */
export function searchCatalog(
  products: readonly StoreProduct[],
  query: string,
): StoreProduct[] {
  const needle = normalize(query);
  if (!needle) return [...products];
  return products.filter(
    (p) =>
      normalize(p.name).includes(needle) ||
      normalize(shortProductName(p.name)).includes(needle),
  );
}

const normalize = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
