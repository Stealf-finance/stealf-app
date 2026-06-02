import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { balanceQueries, fetchBalance } from '@/src/features/bank/api/balance';
import { historyQueries, fetchHistory } from '@/src/features/bank/api/history';

/**
 * Warms the React Query cache with a wallet's balance + recent history.
 *
 * Owns the cross-feature `fetchBalance` / `fetchHistory` calls so other
 * features (e.g. the stealth hub priming a freshly-imported wallet) can
 * prefetch bank data without importing the bank `api/` layer themselves.
 */
export function usePrefetchWalletData() {
  const queryClient = useQueryClient();

  return useCallback(
    (sessionToken: string, address: string) => {
      void queryClient.prefetchQuery({
        queryKey: balanceQueries.byAddress(address),
        queryFn: () => fetchBalance(sessionToken, address),
        staleTime: Infinity,
      });
      void queryClient.prefetchQuery({
        queryKey: historyQueries.byAddress(address),
        queryFn: () => fetchHistory(sessionToken, address, 10),
        staleTime: Infinity,
      });
    },
    [queryClient],
  );
}
