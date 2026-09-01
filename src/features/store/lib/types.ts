import type { StoreGroup } from '../api/curated';

/** UI copy per group — the internal slug never reaches the screen. */
export const GROUP_LABELS: Record<StoreGroup, string> = {
  ecommerce: 'E-commerce',
  gaming: 'Gaming',
  streaming: 'Streaming',
  food: 'Food & Delivery',
};
