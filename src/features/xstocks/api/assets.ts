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
  multiplier: z.number(),
  status: z.object({
    symbol: z.string(),
    isMarketTradingHalted: z.boolean(),
    isAtomicTradingHalted: z.boolean(),
  }),
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
