import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { ApiError } from '@/src/services/api/errors';
import { fetchCuratedProducts, storeQueries } from '../api/curated';

const ONE_HOUR = 60 * 60_000;

/** Mirrors the backend's 1h cache; 401/503 are not worth retrying. */
export function useCuratedProducts() {
  const { session } = useAuth();
  const token = session?.sessionToken ?? null;

  return useQuery({
    queryKey: storeQueries.curated(),
    queryFn: () => fetchCuratedProducts(token),
    enabled: !!token,
    staleTime: ONE_HOUR,
    retry: (count, error) => {
      if (error instanceof ApiError && [401, 503].includes(error.status)) {
        return false;
      }
      return count < 2;
    },
  });
}
