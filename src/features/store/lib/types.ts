/**
 * Store (gift cards) — shared shapes.
 *
 * `StoreProduct` mirrors the backend's `NormalizedProduct`
 * (`backend-stealf/src/services/bitrefill/types.ts`) field for field, so
 * swapping the static catalog for the real `/api/giftcards/products` response
 * is an import change, not a refactor. The one addition is `category`:
 * `normalizeProduct` drops it, and the app needs it to section the catalog.
 * When this is wired for real the sections come from per-category queries
 * (`/products?category=retail`), which is what the endpoint is built for.
 */

/** Mirrors GIFTCARD_CATEGORIES in the backend's bitrefill/constants.ts.
 *  Bitrefill has no single "giftcard" category — it 400s on one. */
export const STORE_CATEGORIES = [
  'retail',
  'games',
  'ecommerce',
  'streaming',
  'entertainment',
  'apparel',
  'food',
  'food-delivery',
  'travel',
  'experiences',
  'gifts',
  'health-beauty',
  'electronics',
  'restaurants',
  'multi-brand',
  'payment-cards',
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number];

/** UI copy for each category — the internal slug never reaches the screen. */
export const CATEGORY_LABELS: Record<StoreCategory, string> = {
  retail: 'Retail',
  games: 'Gaming',
  ecommerce: 'E-commerce',
  streaming: 'Streaming',
  entertainment: 'Entertainment',
  apparel: 'Fashion',
  food: 'Food & Drink',
  'food-delivery': 'Food Delivery',
  travel: 'Travel',
  experiences: 'Experiences',
  gifts: 'Gifts',
  'health-beauty': 'Health & Beauty',
  electronics: 'Electronics',
  restaurants: 'Restaurants',
  'multi-brand': 'Multi-brand',
  'payment-cards': 'Payment Cards',
};

/** A fixed denomination. `value` is `string | number` upstream — Bitrefill
 *  documents both — so it stays wide here and is coerced at the edge. */
export type StorePackage = {
  packageId: string;
  value: string | number;
  /** Partner cost in the account currency. */
  price?: number;
};

/** An open-amount product: any value in [min, max] on `step` increments. */
export type StoreRange = {
  min?: number;
  max?: number;
  step?: number;
  priceRate?: number;
};

export type StoreProduct = {
  id: string;
  name: string;
  country?: string;
  currency?: string;
  image?: string;
  inStock: boolean;
  packages: StorePackage[];
  range?: StoreRange;
  category: StoreCategory;
};

/** One line in the cart: a product at one denomination, times a quantity. */
export type CartLine = {
  productId: string;
  name: string;
  currency: string;
  /** Present for fixed-denomination products; absent for a ranged amount. */
  packageId?: string;
  /** Face value of the card, coerced to a number. */
  value: number;
  /** What the user pays for one card. */
  unitPrice: number;
  quantity: number;
};
