import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchHistory, historyQueries } from '../api/history';
import type { HistoryResponse } from '../types';

const DEFAULT_HISTORY_LIMIT = 10;

export function useHistory(address: string | null | undefined) {
  const { session } = useAuth();
  const token = session?.sessionToken;

  return useQuery<HistoryResponse>({
    queryKey: historyQueries.byAddress(address ?? ''),
    queryFn: () => {
      if (!token || !address) {
        throw new Error('useHistory called without auth or address');
      }
      return fetchHistory(token, address, DEFAULT_HISTORY_LIMIT);
    },
    enabled: Boolean(token && address),
    staleTime: Infinity,
  });
}
