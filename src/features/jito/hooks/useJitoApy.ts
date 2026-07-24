import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchJitoApy, jitoApyQueries } from '../api/jitoApy';

/** JitoSOL staking APY (percent) from the backend. Slow-moving → long cache. */
export function useJitoApy() {
  const { session } = useAuth();
  const token = session?.sessionToken ?? null;

  return useQuery({
    queryKey: jitoApyQueries.all,
    queryFn: () => fetchJitoApy(token!),
    enabled: !!token,
    staleTime: 300_000,
    refetchInterval: 300_000,
    retry: 2,
  });
}
