import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchPendingClaims } from '@/src/services/umbra/queries/claims';

export const pendingClaimsQueries = {
  byStealfWallet: (wallet: string) =>
    ['stealth', 'pending-claims', wallet] as const,
};

/**
 * Scan the indexer for UTXOs received by the current stealth wallet that are
 * still claimable into encrypted balance. Polled every 30s while focused.
 */
export function usePendingClaims() {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? '';

  return useQuery({
    queryKey: pendingClaimsQueries.byStealfWallet(wallet),
    queryFn: () => fetchPendingClaims(),
    enabled: !!wallet,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
