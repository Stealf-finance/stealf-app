/**
 * JitoSOL liquid staking — api layer (Option B, non-private).
 *
 * Follows the strict 3-layer pattern: pure functions + Zod parse here, React
 * Query / mutation wrappers live in `../hooks/useJitoStake.ts`. Targets the
 * backend `/api/yield/jito/*` routes.
 *
 * The user's bank wallet swaps native SOL <-> JitoSOL against the public Jito
 * stake pool routed by Jupiter Ultra. The backend builds an UNSIGNED tx; the
 * client SIGNS it (Turnkey, sign-only — no broadcast) and POSTs the signed tx
 * to `/execute`, which lets Jupiter land it. JitoSOL is held directly in the
 * bank wallet and appreciates vs SOL over time — that is the yield.
 */
import { z } from 'zod';
import { apiPost } from '@/src/services/api/client';

export const SOL_DECIMALS = 9;
export const JITOSOL_DECIMALS = 9;

/** Mainnet JitoSOL mint — a normal SPL token held directly in the bank wallet. */
export const JITOSOL_MINT = 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn';

// ---------- Schemas / DTOs ----------

export const BuildStakeResponseSchema = z.object({
  requestId: z.string(),
  unsignedTransactionBase64: z.string(),
  inSolLamports: z.number(),
  outJitoSolBaseUnits: z.number(),
  slippageBps: z.number(),
});
export type BuildStakeResponse = z.infer<typeof BuildStakeResponseSchema>;

export const BuildUnstakeResponseSchema = z.object({
  requestId: z.string(),
  unsignedTransactionBase64: z.string(),
  inJitoSolBaseUnits: z.number(),
  outSolLamports: z.number(),
  slippageBps: z.number(),
});
export type BuildUnstakeResponse = z.infer<typeof BuildUnstakeResponseSchema>;

export const ExecuteResponseSchema = z.object({
  status: z.string(),
  signature: z.string(),
});
export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;

// ---------- Helpers ----------

/** SOL → lamports. Floors so we never try to stake more than the balance. */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 10 ** SOL_DECIMALS);
}

export function lamportsToSol(lamports: number): number {
  return lamports / 10 ** SOL_DECIMALS;
}

export function jitoSolToBaseUnits(jitoSol: number): number {
  return Math.floor(jitoSol * 10 ** JITOSOL_DECIMALS);
}

export function baseUnitsToJitoSol(baseUnits: number): number {
  return baseUnits / 10 ** JITOSOL_DECIMALS;
}

// ---------- Build TX (authenticated) ----------

export type BuildStakeRequest = {
  solLamports: number;
  slippageBps?: number;
  signer?: string; // pass user.bankWallet so the built tx matches our signer
};

export type BuildUnstakeRequest = {
  jitoSolBaseUnits: number;
  slippageBps?: number;
  signer?: string;
};

export async function buildJitoStake(
  token: string,
  body: BuildStakeRequest,
): Promise<BuildStakeResponse> {
  const raw = await apiPost('/api/yield/jito/build-stake', token, body);
  return BuildStakeResponseSchema.parse(raw);
}

export async function buildJitoUnstake(
  token: string,
  body: BuildUnstakeRequest,
): Promise<BuildUnstakeResponse> {
  const raw = await apiPost('/api/yield/jito/build-unstake', token, body);
  return BuildUnstakeResponseSchema.parse(raw);
}

// ---------- Execute (POST signed tx; backend lands it via Jupiter) ----------

export type ExecuteRequest = {
  requestId: string;
  signedTransaction: string; // base64
};

export async function executeJitoSwap(
  token: string,
  body: ExecuteRequest,
): Promise<ExecuteResponse> {
  const raw = await apiPost('/api/yield/jito/execute', token, body);
  return ExecuteResponseSchema.parse(raw);
}
