/**
 * xStocks (tokenized stocks) — api layer.
 *
 * Follows stealf-app's strict 3-layer pattern: pure functions + Zod parse here,
 * React Query wrappers live in `../hooks/`. Targets the backend
 * `/api/xstocks/*` routes (Phase 1).
 *
 * xStocks are Solana tokens tracking real-world equities. The backend builds an
 * unsigned Jupiter Ultra swap transaction (USDC ↔ xStock); the client SIGNS it
 * (Turnkey for the bank wallet, sign-only — no broadcast) and POSTs the signed
 * tx back to `/execute`, which lets Jupiter land it.
 */
import { z } from 'zod';
import { apiGet, apiPost } from '@/src/services/api/client';

export const USDC_DECIMALS = 6;

// ---------- Schemas / DTOs ----------

export const XstockAssetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  underlyingSymbol: z.string(),
  isin: z.string(),
  logo: z.string(),
  mint: z.string(),
  tokenProgram: z.string(),
  isTradingHalted: z.boolean(),
});
export type XstockAsset = z.infer<typeof XstockAssetSchema>;

export const XstockMultiplierSchema = z.object({
  currentMultiplier: z.number(),
  newMultiplier: z.number(),
  activationDateTime: z.number(),
  reason: z.string().nullable(),
});
export type XstockMultiplier = z.infer<typeof XstockMultiplierSchema>;

export const XstockStatusSchema = z.object({
  symbol: z.string(),
  isMarketTradingHalted: z.boolean(),
  isAtomicTradingHalted: z.boolean(),
});
export type XstockStatus = z.infer<typeof XstockStatusSchema>;

export const XstockDetailSchema = XstockAssetSchema.extend({
  referencePrice: z.number().nullable(),
  multiplier: XstockMultiplierSchema,
  status: XstockStatusSchema,
});
export type XstockDetail = z.infer<typeof XstockDetailSchema>;

export const XstockBalanceSchema = z.object({
  wallet: z.string(),
  symbol: z.string(),
  ata: z.string(),
  rawBaseUnits: z.number(),
  uiAmount: z.number().nullable(),
  uiAmountString: z.string(),
  ataExists: z.boolean(),
});
export type XstockBalance = z.infer<typeof XstockBalanceSchema>;

export const BuildBuyResponseSchema = z.object({
  symbol: z.string(),
  mint: z.string(),
  requestId: z.string(),
  unsignedTransactionBase64: z.string(),
  inUsdcBaseUnits: z.number(),
  outXstockRawBaseUnits: z.number(),
  referencePrice: z.number().nullable(),
  // build-buy/sell return the numeric current multiplier, not the full object.
  multiplier: z.number(),
  slippageBps: z.number(),
});
export type BuildBuyResponse = z.infer<typeof BuildBuyResponseSchema>;

export const BuildSellResponseSchema = z.object({
  symbol: z.string(),
  mint: z.string(),
  requestId: z.string(),
  unsignedTransactionBase64: z.string(),
  inXstockRawBaseUnits: z.number(),
  outUsdcBaseUnits: z.number(),
  referencePrice: z.number().nullable(),
  multiplier: z.number(),
  slippageBps: z.number(),
});
export type BuildSellResponse = z.infer<typeof BuildSellResponseSchema>;

export const ExecuteResponseSchema = z.object({
  status: z.string(),
  signature: z.string(),
});
export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;

// ---------- Query keys ----------

export const xstockQueries = {
  list: () => ['xstocks-list'] as const,
  detail: (symbol: string) => ['xstock-detail', symbol] as const,
  balance: (wallet: string, symbol: string) =>
    ['xstock-balance', wallet, symbol] as const,
};

// ---------- Helpers ----------

/** USD → USDC base units (6 decimals). Floors so we never over-spend. */
export function usdcToBaseUnits(amountUsdc: number): number {
  return Math.floor(amountUsdc * 10 ** USDC_DECIMALS);
}

export function baseUnitsToUsdc(baseUnits: number): number {
  return baseUnits / 10 ** USDC_DECIMALS;
}

// ---------- Public (no auth) reads ----------
//
// The `apiGet(endpoint, null)` form omits the Authorization header, which is
// what these public reads want.

export async function fetchXstocks(): Promise<XstockAsset[]> {
  try {
    const raw = await apiGet<unknown>('/api/xstocks/assets', null);
    return z.array(XstockAssetSchema).parse(raw);
  } catch (err) {
    if (__DEV__) console.error('[xstocks] assets error:', err);
    return [];
  }
}

export async function fetchXstockDetail(
  symbol: string,
): Promise<XstockDetail | null> {
  try {
    const raw = await apiGet<unknown>(
      `/api/xstocks/assets/${encodeURIComponent(symbol)}`,
      null,
    );
    return XstockDetailSchema.parse(raw);
  } catch (err) {
    if (__DEV__) console.error('[xstocks] detail error:', err);
    return null;
  }
}

export async function fetchXstockBalance(
  wallet: string,
  symbol: string,
): Promise<XstockBalance | null> {
  try {
    const raw = await apiGet<unknown>(
      `/api/xstocks/balance?wallet=${encodeURIComponent(
        wallet,
      )}&symbol=${encodeURIComponent(symbol)}`,
      null,
    );
    return XstockBalanceSchema.parse(raw);
  } catch (err) {
    if (__DEV__) console.error('[xstocks] balance error:', err);
    return null;
  }
}

// ---------- Build TX (authenticated) ----------

export type BuildBuyRequest = {
  symbol: string;
  usdcBaseUnits: number;
  slippageBps?: number;
  signer?: string; // pass user.bankWallet so the built tx matches our signer
};

export type BuildSellRequest = {
  symbol: string;
  xstockRawBaseUnits: number;
  slippageBps?: number;
  signer?: string;
};

export async function buildXstockBuy(
  token: string,
  body: BuildBuyRequest,
): Promise<BuildBuyResponse> {
  const raw = await apiPost('/api/xstocks/build-buy', token, body);
  return BuildBuyResponseSchema.parse(raw);
}

export async function buildXstockSell(
  token: string,
  body: BuildSellRequest,
): Promise<BuildSellResponse> {
  const raw = await apiPost('/api/xstocks/build-sell', token, body);
  return BuildSellResponseSchema.parse(raw);
}

// ---------- Execute (POST signed tx; backend lands it via Jupiter) ----------

export type ExecuteRequest = {
  requestId: string;
  signedTransaction: string; // base64
};

export async function executeXstockSwap(
  token: string,
  body: ExecuteRequest,
): Promise<ExecuteResponse> {
  const raw = await apiPost('/api/xstocks/execute', token, body);
  return ExecuteResponseSchema.parse(raw);
}
