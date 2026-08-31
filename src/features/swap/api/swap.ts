/**
 * Jupiter swap — backend `/api/swap/{order,execute}` (auth). Same build → sign →
 * execute shape as xStocks, but arbitrary input/output mints. `taker` is the
 * bank wallet; output goes to the taker (no `receiver`) for a self-swap.
 *
 * `/order` returns the quote + unsigned tx (`transaction`, base64, nullable on a
 * routing error). `/execute` returns 200 even on failure — `code === 0` /
 * `status === "Success"` means it landed.
 */
import { z } from 'zod';
import { apiPost } from '@/src/services/api/client';

export const OrderResponseSchema = z
  .object({
    requestId: z.string(),
    transaction: z.string().nullable(),
    outAmount: z.string().optional(),
    inAmount: z.string().optional(),
    priceImpact: z.number().optional(),
    slippageBps: z.number().optional(),
    errorCode: z.number().optional(),
    errorMessage: z.string().optional(),
  })
  .passthrough();
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export const ExecuteResponseSchema = z
  .object({
    status: z.string(),
    signature: z.string(),
    code: z.number(),
    error: z.string().optional(),
    errorDescription: z.string().optional(),
  })
  .passthrough();
export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;

export type SwapOrderParams = {
  inputMint: string;
  outputMint: string;
  /** Input amount in base units, as a numeric string. */
  amount: string;
  taker: string;
  slippageBps?: number;
};

export async function buildSwapOrder(
  token: string,
  params: SwapOrderParams,
): Promise<OrderResponse> {
  const raw = await apiPost('/api/swap/order', token, params);
  const order = OrderResponseSchema.parse(raw);
  if (order.errorCode != null || order.transaction == null) {
    throw new Error(order.errorMessage ?? 'No route for this swap');
  }
  return order;
}

export async function executeSwap(
  token: string,
  body: { requestId: string; signedTransaction: string },
): Promise<ExecuteResponse> {
  const raw = await apiPost('/api/swap/execute', token, body);
  const res = ExecuteResponseSchema.parse(raw);
  if (res.code !== 0 || res.status !== 'Success') {
    throw new Error(res.errorDescription ?? res.error ?? `Swap ${res.status}`);
  }
  return res;
}
