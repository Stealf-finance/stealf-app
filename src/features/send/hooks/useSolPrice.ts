import { useQuery } from '@tanstack/react-query';
import { fetchSolPrice, solPriceQueries } from '../api/solPrice';

export function useSolPrice() {
  return useQuery({
    queryKey: solPriceQueries.all,
    queryFn: fetchSolPrice,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}
