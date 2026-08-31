/**
 * Static gift-card catalog — the UI's stand-in until the Store is wired to
 * `GET /api/giftcards/products`.
 *
 * Shapes match the backend's `NormalizedProduct` exactly (see ./types), down
 * to Bitrefill's `<product-id><&><value>` package-id convention, so the swap
 * to live data replaces this module and nothing else. `price` is left unset
 * throughout: real pricing comes from Bitrefill, and until then a card is
 * sold at face value.
 */
import type { StoreCategory, StorePackage, StoreProduct } from './types';

/**
 * The catalog is scoped to one country — Bitrefill's `/products?country=`.
 * A single country keeps one currency on screen and avoids duplicate brands
 * (Amazon FR + Amazon IE). Changing the market is this one line.
 */
export const STORE_COUNTRY = 'FR';
export const STORE_CURRENCY = 'EUR';

const fixed = (id: string, values: number[]): StorePackage[] =>
  values.map((value) => ({ packageId: `${id}<&>${value}`, value }));

const card = (
  id: string,
  name: string,
  category: StoreCategory,
  values: number[],
  over: Partial<StoreProduct> = {},
): StoreProduct => ({
  id,
  name,
  category,
  country: STORE_COUNTRY,
  currency: STORE_CURRENCY,
  inStock: true,
  packages: fixed(id, values),
  ...over,
});

export const STORE_CATALOG: StoreProduct[] = [
  // Retail
  card('amazon-fr', 'Amazon', 'retail', [25, 50, 100, 200]),
  card('fnac-fr', 'Fnac', 'retail', [20, 50, 100]),
  card('carrefour-fr', 'Carrefour', 'retail', [25, 50, 100]),
  card('decathlon-fr', 'Decathlon', 'retail', [20, 50, 100]),

  // E-commerce
  card('zalando-fr', 'Zalando', 'ecommerce', [25, 50, 100]),
  card('cdiscount-fr', 'Cdiscount', 'ecommerce', [25, 50]),
  card('aliexpress-fr', 'AliExpress', 'ecommerce', [10, 25, 50]),

  // Streaming
  card('netflix-fr', 'Netflix', 'streaming', [15, 25, 50]),
  card('spotify-fr', 'Spotify', 'streaming', [10, 30, 60]),
  card('disney-plus-fr', 'Disney+', 'streaming', [25, 50]),
  card('deezer-fr', 'Deezer', 'streaming', [10, 30], { inStock: false }),

  // Gaming
  card('playstation-fr', 'PlayStation', 'games', [10, 25, 50, 100]),
  card('xbox-fr', 'Xbox', 'games', [15, 25, 50]),
  card('steam-fr', 'Steam', 'games', [20, 50, 100]),
  card('nintendo-eshop-fr', 'Nintendo eShop', 'games', [15, 25, 50]),

  // Food delivery
  card('uber-eats-fr', 'Uber Eats', 'food-delivery', [15, 25, 50]),
  card('deliveroo-fr', 'Deliveroo', 'food-delivery', [20, 50]),
  card('just-eat-fr', 'Just Eat', 'food-delivery', [15, 25, 50]),

  // Travel — SNCF sells any amount, so it carries a range instead of packages
  card('airbnb-fr', 'Airbnb', 'travel', [50, 100, 200]),
  card('booking-fr', 'Booking.com', 'travel', [50, 100, 250]),
  card('sncf-connect-fr', 'SNCF Connect', 'travel', [], {
    packages: [],
    range: { min: 10, max: 500, step: 5 },
  }),

  // Fashion
  card('nike-fr', 'Nike', 'apparel', [25, 50, 100]),
  card('zara-fr', 'Zara', 'apparel', [25, 50, 100]),
  card('h-m-fr', 'H&M', 'apparel', [20, 50]),

  // Electronics
  card('apple-fr', 'Apple', 'electronics', [25, 50, 100, 150]),
  card('boulanger-fr', 'Boulanger', 'electronics', [30, 50, 100]),
];

/** Category display order — most-shopped first, matching the mockup's flow. */
export const CATEGORY_ORDER: StoreCategory[] = [
  'retail',
  'ecommerce',
  'streaming',
  'games',
  'food-delivery',
  'travel',
  'apparel',
  'electronics',
];

export type CategorySectionVM = {
  category: StoreCategory;
  products: StoreProduct[];
};

/** Groups a catalog into display sections, dropping categories with no
 *  products so a filter never leaves an empty heading behind. */
export function groupByCategory(
  catalog: readonly StoreProduct[],
  order: readonly StoreCategory[] = CATEGORY_ORDER,
): CategorySectionVM[] {
  return order
    .map((category) => ({
      category,
      products: catalog.filter((p) => p.category === category),
    }))
    .filter((section) => section.products.length > 0);
}

/** Local name search — case- and accent-insensitive, trimmed. An empty
 *  query returns the catalog untouched. */
export function searchCatalog(
  catalog: readonly StoreProduct[],
  query: string,
): StoreProduct[] {
  const needle = normalize(query);
  if (!needle) return [...catalog];
  return catalog.filter((p) => normalize(p.name).includes(needle));
}

const normalize = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Restricts a catalog to a set of categories. An empty set means "no
 *  filter", which is what the filter sheet starts at. */
export function filterByCategories(
  catalog: readonly StoreProduct[],
  categories: readonly StoreCategory[],
): StoreProduct[] {
  if (categories.length === 0) return [...catalog];
  const set = new Set(categories);
  return catalog.filter((p) => set.has(p.category));
}
