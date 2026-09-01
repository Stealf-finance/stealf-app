import type { StoreGroup } from '../api/curated';

/** UI copy per group — the internal slug never reaches the screen. */
export const GROUP_LABELS: Record<StoreGroup, string> = {
  ecommerce: 'E-commerce',
  gaming: 'Gaming',
  streaming: 'Streaming',
  food: 'Food & Delivery',
};

export type CartLine = {
  productId: string;
  name: string;
  currency: string;
  /** Absent for a ranged amount. */
  packageId?: string;
  value: number;
  unitPrice: number;
  quantity: number;
};
