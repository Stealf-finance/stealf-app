import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchHistory, historyQueries } from '../api/history';
import type { HistoryResponse } from '../types';

export function useHistory(
  address: string | null | undefined,
  limit = 10,
) {
  const { session } = useAuth();
  const token = session?.sessionToken;

  return useQuery<HistoryResponse>({
    queryKey: historyQueries.byAddress(address ?? '', limit),
    queryFn: () => {
      if (!token || !address) {
        throw new Error('useHistory called without auth or address');
      }
      return fetchHistory(token, address, limit);
    },
    enabled: Boolean(token && address),
    staleTime: Infinity,
  });
}
