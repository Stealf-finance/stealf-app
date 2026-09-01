import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

/** Mirrors GIFTCARD_GROUPS in the backend. Note `gaming`, not `games`. */
export const STORE_GROUPS = [
  'ecommerce',
  'gaming',
  'streaming',
  'food',
] as const;

export type StoreGroup = (typeof STORE_GROUPS)[number];

export const StorePackageSchema = z.object({
  packageId: z.string(),
  value: z.union([z.string(), z.number()]),
  price: z.number().optional(),
});
export type StorePackage = z.infer<typeof StorePackageSchema>;

export const StoreRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  priceRate: z.number().optional(),
});
export type StoreRange = z.infer<typeof StoreRangeSchema>;

export const StoreProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().optional(),
  /** The CARD's currency, not what the user pays. See STORE.md. */
  currency: z.string().optional(),
  image: z.string().optional(),
  inStock: z.boolean(),
  packages: z.array(StorePackageSchema).default([]),
  range: StoreRangeSchema.optional(),
  group: z.enum(STORE_GROUPS),
});
export type StoreProduct = z.infer<typeof StoreProductSchema>;

export const StoreGroupSectionSchema = z.object({
  group: z.enum(STORE_GROUPS),
  products: z.array(StoreProductSchema),
});
export type StoreGroupSection = z.infer<typeof StoreGroupSectionSchema>;

const CuratedResponseSchema = z.object({
  groups: z.array(StoreGroupSectionSchema),
});

export const storeQueries = {
  curated: () => ['giftcards', 'curated'] as const,
};

export async function fetchCuratedProducts(
  token: string | null,
): Promise<StoreGroupSection[]> {
  const data = await apiGet('/api/giftcards/products/curated', token);
  return CuratedResponseSchema.parse(data).groups;
}
