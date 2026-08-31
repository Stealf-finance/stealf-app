/**
 * "Best Selling" — a curated list, not a data signal.
 *
 * Bitrefill's catalog carries no popularity field (no rank, no sales count),
 * so the rail at the top of the Store is editorial. Ids are resolved against
 * whatever catalog is loaded and anything that does not resolve is dropped
 * silently: a brand pulled from the catalog must never empty the screen.
 */
import type { StoreProduct } from './types';

export const FEATURED_PRODUCT_IDS: readonly string[] = [
  'amazon-fr',
  'apple-fr',
  'netflix-fr',
  'uber-eats-fr',
  'playstation-fr',
  'zalando-fr',
  'spotify-fr',
  'airbnb-fr',
];

/** Curated ids → products, in the curated order, skipping misses and
 *  out-of-stock brands. Duplicated ids resolve once. */
export function resolveFeatured(
  catalog: readonly StoreProduct[],
  ids: readonly string[] = FEATURED_PRODUCT_IDS,
): StoreProduct[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: StoreProduct[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const product = byId.get(id);
    if (product && product.inStock) out.push(product);
  }
  return out;
}
