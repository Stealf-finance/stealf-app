/**
 * xStocks catalogue — backend `/api/xstocks/*` (public reads, no auth).
 * `apiGet(path, null)` prepends the API base and unwraps the `{ data }` envelope.
 *
 * An xStock is a tokenised stock (Token-2022) traded via a Jupiter swap. The
 * catalogue list has no prices; per-asset detail (`/assets/:symbol`) adds
 * referencePrice / multiplier / trading status.
 */
import { z } from 'zod';
import { apiGet } from '@/src/services/api/client';

export const SolanaXstockSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  underlyingSymbol: z.string().optional(),
  isin: z.string().optional(),
  logo: z.string(),
  mint: z.string(),
  tokenProgram: z.string(),
  isTradingHalted: z.boolean(),
});
export type SolanaXstock = z.infer<typeof SolanaXstockSchema>;

export const XstockDetailSchema = SolanaXstockSchema.extend({
  referencePrice: z.number().nullable(),
  /** 24h price change in percent (1.29 = +1.29%), or null. Detail only. */
  priceChange24h: z.number().nullable().optional(),
  // Not used in the UI yet — kept loose so a backend shape change can't fail
  // the parse and discard the price/change we DO display.
  multiplier: z.unknown().optional(),
  status: z.unknown().optional(),
});
export type XstockDetail = z.infer<typeof XstockDetailSchema>;

export const xstockQueries = {
  assets: () => ['xstocks', 'assets'] as const,
  asset: (symbol: string) => ['xstocks', 'asset', symbol] as const,
  balance: (wallet: string, symbol: string) =>
    ['xstocks', 'balance', wallet, symbol] as const,
};

export async function fetchXstockAssets(): Promise<SolanaXstock[]> {
  const data = await apiGet('/api/xstocks/assets', null);
  return z.array(SolanaXstockSchema).parse(data);
}

export async function fetchXstockAsset(symbol: string): Promise<XstockDetail> {
  const data = await apiGet(`/api/xstocks/assets/${encodeURIComponent(symbol)}`, null);
  return XstockDetailSchema.parse(data);
}
