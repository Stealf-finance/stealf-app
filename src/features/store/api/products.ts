import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';
import { StoreProductSchema } from './curated';

/** Every catalog route but `/curated` returns the product without a `group`. */
export const StoreCatalogProductSchema = StoreProductSchema.omit({
  group: true,
});
export type StoreCatalogProduct = z.infer<typeof StoreCatalogProductSchema>;

const StoreCatalogListSchema = z.array(StoreCatalogProductSchema);

export type StorePageParams = { start?: number; limit?: number };

export type StoreProductsParams = StorePageParams & {
  country?: string;
  category?: string;
};

export const productQueries = {
  list: (params: StoreProductsParams) =>
    ['giftcards', 'products', params] as const,
  search: (query: string, params: StorePageParams) =>
    ['giftcards', 'products', 'search', query, params] as const,
  byId: (id: string) => ['giftcards', 'product', id] as const,
};

/** Hand-rolled: RN's `URLSearchParams` is a partial subset of the spec. */
function queryString(params: Record<string, string | number | undefined>) {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return pairs.length ? `?${pairs.join('&')}` : '';
}

export async function fetchProducts(
  token: string | null,
  params: StoreProductsParams = {},
): Promise<StoreCatalogProduct[]> {
  const data = await apiGet(
    `/api/giftcards/products${queryString(params)}`,
    token,
  );
  return StoreCatalogListSchema.parse(data);
}

/** Bitrefill's product quota is platform-wide — the Buy tab searches locally. */
export async function searchProducts(
  token: string | null,
  query: string,
  params: StorePageParams = {},
): Promise<StoreCatalogProduct[]> {
  const data = await apiGet(
    `/api/giftcards/products/search${queryString({ query, ...params })}`,
    token,
  );
  return StoreCatalogListSchema.parse(data);
}

export async function fetchProduct(
  token: string | null,
  id: string,
): Promise<StoreCatalogProduct> {
  const data = await apiGet(
    `/api/giftcards/products/${encodeURIComponent(id)}`,
    token,
  );
  return StoreCatalogProductSchema.parse(data);
}
