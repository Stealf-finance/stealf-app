/**
 * xStocks read hooks — React Query wrappers over the `api/xstocks` fetchers.
 *
 * Mirrors `grow/hooks/useUsdcYieldData`. All three reads are public on the
 * backend, so no auth token is threaded here.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchXstocks,
  fetchXstockBalance,
  fetchXstockDetail,
  xstockQueries,
  type XstockAsset,
  type XstockBalance,
  type XstockDetail,
} from '../api/xstocks';

/** The curated list of tokenized stocks. Public — no auth needed. */
export function useXstocksList() {
  return useQuery<XstockAsset[]>({
    queryKey: xstockQueries.list(),
    queryFn: fetchXstocks,
    staleTime: 60_000,
  });
}

/** Full detail (reference price, multiplier, halt status) for one symbol. */
export function useXstockDetail(symbol: string | null | undefined) {
  return useQuery<XstockDetail | null>({
    queryKey: xstockQueries.detail(symbol ?? ''),
    queryFn: () => {
      if (!symbol) throw new Error('useXstockDetail called without symbol');
      return fetchXstockDetail(symbol);
    },
    enabled: Boolean(symbol),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/** On-chain xStock balance for `wallet` + `symbol` (the user's bank wallet). */
export function useXstockBalance(
  wallet: string | null | undefined,
  symbol: string | null | undefined,
) {
  return useQuery<XstockBalance | null>({
    queryKey: xstockQueries.balance(wallet ?? '', symbol ?? ''),
    queryFn: () => {
      if (!wallet || !symbol) {
        throw new Error('useXstockBalance called without wallet or symbol');
      }
      return fetchXstockBalance(wallet, symbol);
    },
    enabled: Boolean(wallet && symbol),
    staleTime: 30_000,
  });
}

/** Invalidate cached balance + detail after a buy/sell settles. */
export function useInvalidateXstock() {
  const queryClient = useQueryClient();
  return (wallet?: string, symbol?: string) => {
    queryClient.invalidateQueries({
      queryKey:
        wallet && symbol
          ? xstockQueries.balance(wallet, symbol)
          : ['xstock-balance'],
    });
    if (symbol) {
      queryClient.invalidateQueries({ queryKey: xstockQueries.detail(symbol) });
    }
  };
}
