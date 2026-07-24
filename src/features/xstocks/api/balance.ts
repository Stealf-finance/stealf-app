/**
 * xStock balance for a wallet — backend `/api/xstocks/balance` (public).
 *
 * `rawBaseUnits` is the raw Token-2022 amount (NEVER scaled) — use it for
 * transactions (build-sell). `uiAmount` is already scaled by the multiplier —
 * use it for DISPLAY only. Never show rawBaseUnits; never send uiAmount to a
 * build call.
 */
import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

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

export async function fetchXstockBalance(
  wallet: string,
  symbol: string,
): Promise<XstockBalance> {
  const data = await apiGet(
    `/api/xstocks/balance?wallet=${encodeURIComponent(wallet)}&symbol=${encodeURIComponent(symbol)}`,
    null,
  );
  return XstockBalanceSchema.parse(data);
}
