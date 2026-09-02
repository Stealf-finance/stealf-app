/**
 * STLF yield (Reflect) — api layer.
 *
 * STLF is Stealf's branded yield-bearing stablecoin, backed by Reflect's USDC+.
 * The backend (`/api/yield/usdc/*`) builds the unsigned mint/burn transaction;
 * the app signs (Turnkey for the bank wallet) + broadcasts on the backend-
 * supplied mainnet `rpcUrl`. Settlement is observed through the wallet's
 * `balance:updated` socket event, not polled.
 *
 * Strict 3-layer: pure functions + Zod parse here; React Query wrappers live in
 * `../hooks/`. Internal fields keep the backend's `usdcPlus*` names; the UI
 * shows the "STLF" brand.
 */
import { z } from 'zod';
import { apiGet, apiPost } from '@/src/services/api/client';
import { getEnv } from '@/src/services/env';

export const USDC_DECIMALS = 6;
export const STLF_DECIMALS = 6;

// ---------- Schemas / DTOs ----------

export const ReflectStatsSchema = z.object({
  rate: z.number(),
  receiptRate: z.number(),
  realtimeApy: z.number(),
  calculatedApy: z.number(),
  tvlUsd: z.number(),
  users: z.number(),
  timestamp: z.string(),
});
export type ReflectStats = z.infer<typeof ReflectStatsSchema>;

export const ReflectBalanceSchema = z.object({
  wallet: z.string(),
  mint: z.string().optional(),
  ata: z.string(),
  usdcPlusBaseUnits: z.number(),
  usdcPlusUiAmount: z.number(),
  rate: z.number(),
  usdValue: z.number(),
  ataExists: z.boolean(),
});
export type ReflectBalance = z.infer<typeof ReflectBalanceSchema>;

export const UnsignedReflectTxSchema = z.object({
  unsignedTransactionBase64: z.string(),
  expectedReceivedBaseUnits: z.number(),
  minimumReceivedBaseUnits: z.number(),
  rate: z.number(),
  slippageBps: z.number(),
  signer: z.string(),
  // Cluster RPC to broadcast on. Reflect/STLF is mainnet, but the app's bundled
  // EXPO_PUBLIC_SOLANA_RPC_URL is devnet — the backend hands us the right one.
  // Validated here rather than trusted: a blank or non-http value travels all
  // the way into Turnkey's signAndSendTransaction and comes back as
  // "Transaction simulation failed", pointing nowhere near the misconfigured
  // server that sent it.
  rpcUrl: z
    .string()
    .refine((u) => /^https?:\/\//.test(u), 'rpcUrl must be an http(s) endpoint'),
});
export type UnsignedReflectTx = z.infer<typeof UnsignedReflectTxSchema>;

// ---------- Query keys ----------

export const reflectQueries = {
  stats: () => ['reflect-stats'] as const,
  balance: (wallet: string) => ['reflect-balance', wallet] as const,
};

// ---------- Helpers ----------

/** Floor a UI amount to whole base units (never over-spend on rounding). */
export function usdcToBaseUnits(amountUsdc: number): number {
  return Math.floor(amountUsdc * 10 ** USDC_DECIMALS);
}

export function baseUnitsToUsdc(baseUnits: number): number {
  return baseUnits / 10 ** USDC_DECIMALS;
}

// ---------- Public (no auth) reads ----------

export async function fetchReflectStats(): Promise<ReflectStats | null> {
  try {
    const { EXPO_PUBLIC_API_URL } = getEnv();
    const res = await fetch(`${EXPO_PUBLIC_API_URL}/api/yield/usdc/stats`);
    if (!res.ok) return null;
    const json = await res.json();
    return ReflectStatsSchema.parse(json.data ?? json);
  } catch (err) {
    if (__DEV__) console.error('[reflect] stats error:', err);
    return null;
  }
}

// ---------- Authenticated reads ----------

export async function fetchReflectBalance(
  token: string,
  wallet: string,
): Promise<ReflectBalance | null> {
  try {
    const raw = await apiGet(
      `/api/yield/usdc/balance?wallet=${encodeURIComponent(wallet)}`,
      token,
    );
    return ReflectBalanceSchema.parse(raw);
  } catch (err) {
    if (__DEV__) console.error('[reflect] balance error:', err);
    return null;
  }
}

// ---------- Build TX (authenticated) ----------

export type BuildMintRequest = {
  amount: number; // USDC base units
  slippageBps?: number;
  signer?: string; // omit → backend uses wallet
};

export type BuildBurnRequest = {
  amount: number; // STLF base units
  slippageBps?: number;
  signer?: string;
};

export async function buildReflectMint(
  token: string,
  body: BuildMintRequest,
): Promise<UnsignedReflectTx> {
  const raw = await apiPost('/api/yield/usdc/build-mint', token, body);
  return UnsignedReflectTxSchema.parse(raw);
}

export async function buildReflectBurn(
  token: string,
  body: BuildBurnRequest,
): Promise<UnsignedReflectTx> {
  const raw = await apiPost('/api/yield/usdc/build-burn', token, body);
  return UnsignedReflectTxSchema.parse(raw);
}
