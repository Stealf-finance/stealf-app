import { useQuery } from '@tanstack/react-query';
import { fetchJitoApy, jitoApyQueries } from '../api/jitoApy';

/** JitoSOL staking APY (percent) from Jito's public stats API. Slow-moving → long cache. */
export function useJitoApy() {
  return useQuery({
    queryKey: jitoApyQueries.all,
    queryFn: fetchJitoApy,
    staleTime: 300_000,
    refetchInterval: 300_000,
    retry: 2,
  });
}
