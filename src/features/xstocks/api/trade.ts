/**
 * xStock trade — backend `/api/xstocks/{build-buy,build-sell,execute}` (auth).
 * Flow: build → sign (stealth ED25519) → execute. `apiPost` sends the Turnkey
 * session token, unwraps `{ data }`, and throws on non-2xx.
 *
 * The signer is always the stealth wallet address (the backend accepts it).
 * BUY spends `usdcBaseUnits` (USDC, 6dp); SELL sends `xstockRawBaseUnits` (raw
 * Token-2022 — never the scaled uiAmount).
 */
import { z } from 'zod';
import { apiPost } from '@/src/services/api/client';

export const BuildResultSchema = z
  .object({
    requestId: z.string(),
    unsignedTransactionBase64: z.string(),
  })
  .passthrough();
export type BuildResult = z.infer<typeof BuildResultSchema>;

export const ExecuteResultSchema = z
  .object({
    status: z.string(),
    signature: z.string(),
  })
  .passthrough();
export type ExecuteResult = z.infer<typeof ExecuteResultSchema>;

export async function buildBuy(
  token: string,
  body: { symbol: string; usdcBaseUnits: number; signer: string; slippageBps?: number },
): Promise<BuildResult> {
  const raw = await apiPost('/api/xstocks/build-buy', token, body);
  return BuildResultSchema.parse(raw);
}

export async function buildSell(
  token: string,
  body: { symbol: string; xstockRawBaseUnits: number; signer: string; slippageBps?: number },
): Promise<BuildResult> {
  const raw = await apiPost('/api/xstocks/build-sell', token, body);
  return BuildResultSchema.parse(raw);
}

export async function executeTrade(
  token: string,
  body: { requestId: string; signedTransaction: string },
): Promise<ExecuteResult> {
  const raw = await apiPost('/api/xstocks/execute', token, body);
  return ExecuteResultSchema.parse(raw);
}
