import { useQuery } from '@tanstack/react-query';
import { fetchXstockAssets, xstockQueries } from '../api/assets';

/** Curated xStock catalogue (public). Slow-moving → long cache. */
export function useXstockAssets() {
  return useQuery({
    queryKey: xstockQueries.assets(),
    queryFn: fetchXstockAssets,
    staleTime: 5 * 60_000,
  });
}
