import { useQuery } from '@tanstack/react-query';
import { fetchXstockAsset, xstockQueries, type XstockDetail } from '../api/assets';

/** Per-asset detail (reference price, multiplier, trading status). Public. */
export function useXstockAsset(symbol: string | null) {
  return useQuery<XstockDetail>({
    queryKey: xstockQueries.asset(symbol ?? ''),
    queryFn: () => fetchXstockAsset(symbol!),
    enabled: !!symbol,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
