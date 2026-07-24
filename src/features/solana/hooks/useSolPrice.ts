import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchSolPrice, solPriceQueries } from '../api/solPrice';

/** SOL/USD price from the backend pricing endpoint. Requires auth. */
export function useSolPrice() {
  const { session } = useAuth();
  const token = session?.sessionToken ?? null;

  return useQuery({
    queryKey: solPriceQueries.all,
    queryFn: () => fetchSolPrice(token!),
    enabled: !!token,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}
