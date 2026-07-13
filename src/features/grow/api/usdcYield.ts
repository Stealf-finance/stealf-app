/**
 * USDC+ yield (Reflect) — api layer.
 *
 * Ported from front-stealf (`src/services/yield/usdcYield.ts`) into stealf-app's
 * strict 3-layer pattern: pure functions + Zod parse here, React Query wrappers
 * live in `../hooks/`. Targets the backend `/api/yield/usdc/*` routes.
 *
 * Reflect mints a yield-bearing USDC+ stablecoin from USDC. The backend builds
 * the unsigned mint/burn transaction; the client signs (Turnkey for the bank
 * wallet) and broadcasts, then records the position via `/confirm`.
 */
import { z } from 'zod';
import { apiGet, apiPost } from '@/src/services/api/client';
import { getEnv } from '@/src/services/env';

export const USDC_DECIMALS = 6;

// ---------- Schemas / DTOs ----------

export const UsdcYieldStatsSchema = z.object({
  rate: z.number(),
  receiptRate: z.number(),
  realtimeApy: z.number(),
  calculatedApy: z.number(),
  tvlUsd: z.number(),
  users: z.number(),
  timestamp: z.string(),
});
export type UsdcYieldStats = z.infer<typeof UsdcYieldStatsSchema>;

export const UsdcPreviewMintSchema = z.object({
  inputUsdcBaseUnits: z.number(),
  expectedReceivedBaseUnits: z.number(),
  rate: z.number(),
  apyForDisplay: z.number(),
});
export type UsdcPreviewMint = z.infer<typeof UsdcPreviewMintSchema>;

export const UsdcPreviewBurnSchema = z.object({
  inputStablecoinBaseUnits: z.number(),
  expectedReceivedUsdcBaseUnits: z.number(),
  rate: z.number(),
});
export type UsdcPreviewBurn = z.infer<typeof UsdcPreviewBurnSchema>;

export const UsdcYieldBalanceSchema = z.object({
  wallet: z.string(),
  ata: z.string(),
  usdcPlusBaseUnits: z.number(),
  usdcPlusUiAmount: z.number(),
  rate: z.number(),
  usdValue: z.number(),
  ataExists: z.boolean(),
});
export type UsdcYieldBalance = z.infer<typeof UsdcYieldBalanceSchema>;

export const UnsignedReflectTxResponseSchema = z.object({
  unsignedTransactionBase64: z.string(),
  expectedReceivedBaseUnits: z.number(),
  minimumReceivedBaseUnits: z.number(),
  rate: z.number(),
  slippageBps: z.number(),
  signer: z.string(),
  // Cluster RPC to broadcast on. Reflect/STLF is mainnet, but the app's bundled
  // EXPO_PUBLIC_SOLANA_RPC_URL is devnet — the backend hands us the right one.
  rpcUrl: z.string(),
});
export type UnsignedReflectTxResponse = z.infer<
  typeof UnsignedReflectTxResponseSchema
>;

export const usdcYieldWalletContexts = ['bank', 'stealth', 'umbra'] as const;
export type UsdcYieldWalletContext = (typeof usdcYieldWalletContexts)[number];

export const UsdcYieldPositionSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  wallet: z.string(),
  walletContext: z.enum(usdcYieldWalletContexts),
  operation: z.enum(['mint', 'burn']),
  txSignature: z.string(),
  usdcBaseUnits: z.number(),
  usdcPlusBaseUnits: z.number(),
  rate: z.number(),
  createdAt: z.string(),
});
export type UsdcYieldPosition = z.infer<typeof UsdcYieldPositionSchema>;

export const UsdcYieldPositionsSchema = z.object({
  positions: z.array(UsdcYieldPositionSchema),
  count: z.number(),
});
export type UsdcYieldPositions = z.infer<typeof UsdcYieldPositionsSchema>;

const ConfirmResponseSchema = z.object({
  recorded: z.boolean(),
  idempotent: z.boolean().optional(),
  id: z.string().optional(),
});

// ---------- Query keys ----------

export const usdcYieldQueries = {
  stats: () => ['usdc-yield-stats'] as const,
  balance: (wallet: string) => ['usdc-yield-balance', wallet] as const,
  positions: (walletContext: UsdcYieldWalletContext | 'all') =>
    ['usdc-yield-positions', walletContext] as const,
};

// ---------- Helpers ----------

export function usdcToBaseUnits(amountUsdc: number): number {
  return Math.floor(amountUsdc * 10 ** USDC_DECIMALS);
}

export function baseUnitsToUsdc(baseUnits: number): number {
  return baseUnits / 10 ** USDC_DECIMALS;
}

// ---------- Public (no auth) reads ----------

export async function fetchUsdcYieldStats(): Promise<UsdcYieldStats | null> {
  try {
    const { EXPO_PUBLIC_API_URL } = getEnv();
    const res = await fetch(`${EXPO_PUBLIC_API_URL}/api/yield/usdc/stats`);
    if (!res.ok) return null;
    const json = await res.json();
    return UsdcYieldStatsSchema.parse(json.data ?? json);
  } catch (err) {
    if (__DEV__) console.error('[grow/usdcYield] stats error:', err);
    return null;
  }
}

export async function previewUsdcMint(
  amountBaseUnits: number,
): Promise<UsdcPreviewMint | null> {
  try {
    const { EXPO_PUBLIC_API_URL } = getEnv();
    const res = await fetch(
      `${EXPO_PUBLIC_API_URL}/api/yield/usdc/preview-mint?amount=${amountBaseUnits}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    return UsdcPreviewMintSchema.parse(json.data ?? json);
  } catch (err) {
    if (__DEV__) console.error('[grow/usdcYield] preview-mint error:', err);
    return null;
  }
}

export async function previewUsdcBurn(
  amountBaseUnits: number,
): Promise<UsdcPreviewBurn | null> {
  try {
    const { EXPO_PUBLIC_API_URL } = getEnv();
    const res = await fetch(
      `${EXPO_PUBLIC_API_URL}/api/yield/usdc/preview-burn?amount=${amountBaseUnits}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    return UsdcPreviewBurnSchema.parse(json.data ?? json);
  } catch (err) {
    if (__DEV__) console.error('[grow/usdcYield] preview-burn error:', err);
    return null;
  }
}

// ---------- Prefetch (login time) ----------
//
// Defined in front-stealf but never actually wired into a DataBootstrap there.
// Kept commented here so it's ready if we want to warm the stats cache at login.
//
// import type { QueryClient } from '@tanstack/react-query';
//
// export async function prefetchUsdcYieldStats(
//   queryClient: QueryClient,
// ): Promise<void> {
//   const stats = await fetchUsdcYieldStats();
//   if (stats) {
//     queryClient.setQueryData(usdcYieldQueries.stats(), stats);
//   }
// }

// ---------- Authenticated reads ----------

export async function fetchUsdcYieldBalance(
  token: string,
  wallet: string,
): Promise<UsdcYieldBalance | null> {
  try {
    const raw = await apiGet(
      `/api/yield/usdc/balance?wallet=${encodeURIComponent(wallet)}`,
      token,
    );
    return UsdcYieldBalanceSchema.parse(raw);
  } catch (err) {
    if (__DEV__) console.error('[grow/usdcYield] balance error:', err);
    return null;
  }
}

export async function fetchUsdcYieldPositions(
  token: string,
  walletContext?: UsdcYieldWalletContext,
): Promise<UsdcYieldPositions> {
  try {
    const qs = walletContext ? `?walletContext=${walletContext}` : '';
    const raw = await apiGet(`/api/yield/usdc/positions${qs}`, token);
    return UsdcYieldPositionsSchema.parse(raw);
  } catch (err) {
    if (__DEV__) console.error('[grow/usdcYield] positions error:', err);
    return { positions: [], count: 0 };
  }
}

// ---------- Build TX (authenticated) ----------

export type BuildMintRequest = {
  amount: number; // USDC base units
  slippageBps?: number;
  signer?: string; // omit → backend uses bank_wallet
};

export type BuildBurnRequest = {
  amount: number; // USDC+ base units
  slippageBps?: number;
  signer?: string;
};

export async function buildUsdcMint(
  token: string,
  body: BuildMintRequest,
): Promise<UnsignedReflectTxResponse> {
  const raw = await apiPost('/api/yield/usdc/build-mint', token, body);
  return UnsignedReflectTxResponseSchema.parse(raw);
}

export async function buildUsdcBurn(
  token: string,
  body: BuildBurnRequest,
): Promise<UnsignedReflectTxResponse> {
  const raw = await apiPost('/api/yield/usdc/build-burn', token, body);
  return UnsignedReflectTxResponseSchema.parse(raw);
}

// ---------- Confirm (record on-chain TX after broadcast) ----------

export type ConfirmRequest = {
  wallet: string;
  walletContext: UsdcYieldWalletContext;
  operation: 'mint' | 'burn';
  txSignature: string;
  usdcBaseUnits: number;
  usdcPlusBaseUnits: number;
  rate: number;
};

export async function confirmUsdcYieldTx(
  token: string,
  body: ConfirmRequest,
): Promise<z.infer<typeof ConfirmResponseSchema>> {
  const raw = await apiPost('/api/yield/usdc/confirm', token, body);
  return ConfirmResponseSchema.parse(raw);
}
