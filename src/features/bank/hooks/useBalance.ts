import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { balanceQueries, fetchBalance } from '../api/balance';
import type { BalanceResponse } from '../types';

export function useBalance(address: string | null | undefined) {
  const { session } = useAuth();
  const token = session?.sessionToken;

  return useQuery<BalanceResponse>({
    queryKey: balanceQueries.byAddress(address ?? ''),
    queryFn: () => {
      if (!token || !address) {
        throw new Error('useBalance called without auth or address');
      }
      return fetchBalance(token, address);
    },
    enabled: Boolean(token && address),
    staleTime: Infinity,
  });
}
