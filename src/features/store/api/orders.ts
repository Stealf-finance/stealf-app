import { z } from 'zod';
import { apiGet, apiPost } from '@/src/services/api/client';
import { ApiError } from '@/src/services/api/errors';

export const STORE_ORDER_STATUSES = [
  'creating',
  'awaiting_payment',
  'paid',
  'submitted',
  'delivered',
  'failed',
  'refunding',
  'refunded',
  'expired',
] as const;

export type StoreOrderStatus = (typeof STORE_ORDER_STATUSES)[number];

/** `payment` is Bitrefill's own invoice address — dropped so nothing can pay it. */
export const StoreOrderSummarySchema = z.object({
  id: z.string(),
  status: z.enum(STORE_ORDER_STATUSES),
  productId: z.string(),
  productName: z.string(),
  currency: z.string().optional(),
  packageId: z.string().optional(),
  value: z.number().optional(),
  quantity: z.number(),
  cost: z.number().optional(),
  costCurrency: z.string().optional(),
  createdAt: z.string(),
});
export type StoreOrderSummary = z.infer<typeof StoreOrderSummarySchema>;

export const StorePaymentInstructionsSchema = StoreOrderSummarySchema.extend({
  /** Raw USDC base units. Size the transfer with this, never `amountUsdc`. */
  amountRaw: z.string().regex(/^\d+$/),
  amountUsdc: z.number().optional(),
  treasuryUmbraAddress: z.string(),
  /** 32 bytes of hex, sent as `optionalData` verbatim — never re-hashed. */
  paymentRef: z.string().regex(/^[0-9a-f]{64}$/),
  expiresAt: z.string(),
});
export type StorePaymentInstructions = z.infer<
  typeof StorePaymentInstructionsSchema
>;

export const StoreRedemptionSchema = z.object({
  code: z.string().optional(),
  pin: z.string().optional(),
  link: z.string().optional(),
  instructions: z.string().optional(),
  other: z.string().optional(),
  barcodeFormat: z.string().optional(),
  barcodeValue: z.string().optional(),
  expirationDate: z.string().optional(),
  giftUrl: z.string().optional(),
});
export type StoreRedemption = z.infer<typeof StoreRedemptionSchema>;

const StoreOrderListSchema = z.array(StoreOrderSummarySchema);
const StoreRedemptionListSchema = z.array(StoreRedemptionSchema);

type CreateStoreOrderBase = {
  productId: string;
  /** 1-20, default 1. */
  quantity?: number;
  /** Unique per user; reuse it on retry — Bitrefill has no idempotency key. */
  clientReference?: string;
};

/** Exactly one of `packageId` (fixed denomination) or `value` (ranged). */
export type CreateStoreOrderRequest = CreateStoreOrderBase &
  (
    | { packageId: string; value?: never }
    | { value: number; packageId?: never }
  );

export const orderQueries = {
  list: () => ['giftcards', 'orders'] as const,
  byId: (id: string) => ['giftcards', 'order', id] as const,
};

export async function createOrder(
  token: string | null,
  body: CreateStoreOrderRequest,
): Promise<StorePaymentInstructions> {
  const data = await apiPost('/api/giftcards/orders', token, body);
  return StorePaymentInstructionsSchema.parse(data);
}

/** "I've paid, go look." A failure here is never a failed purchase. */
export async function checkOrderPayment(
  token: string | null,
  id: string,
): Promise<StoreOrderSummary> {
  const data = await apiPost(
    `/api/giftcards/orders/${encodeURIComponent(id)}/check`,
    token,
  );
  return StoreOrderSummarySchema.parse(data);
}

export async function fetchOrders(
  token: string | null,
): Promise<StoreOrderSummary[]> {
  const data = await apiGet('/api/giftcards/orders', token);
  return StoreOrderListSchema.parse(data);
}

export async function fetchOrder(
  token: string | null,
  id: string,
): Promise<StoreOrderSummary> {
  const data = await apiGet(
    `/api/giftcards/orders/${encodeURIComponent(id)}`,
    token,
  );
  return StoreOrderSummarySchema.parse(data);
}

/** 5 calls / 10 min, and each one spends Bitrefill quota. Never cache the result. */
export async function revealOrderCode(
  token: string | null,
  id: string,
): Promise<StoreRedemption[]> {
  const data = await apiGet(
    `/api/giftcards/orders/${encodeURIComponent(id)}/code`,
    token,
  );
  return StoreRedemptionListSchema.parse(data);
}

/** A 409 on create carries the order the reference already belongs to. */
export function orderFromConflict(error: unknown): StoreOrderSummary | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = z.object({ data: StoreOrderSummarySchema }).safeParse(error.data);
  return body.success ? body.data.data : null;
}

/** A 409 on the code route carries the current status — no second round-trip. */
export function statusFromCodeConflict(error: unknown): StoreOrderStatus | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = z
    .object({ status: z.enum(STORE_ORDER_STATUSES) })
    .safeParse(error.data);
  return body.success ? body.data.status : null;
}
