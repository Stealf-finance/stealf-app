import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { fetchPendingClaimsForCash } from '@/src/services/umbra/queries/claims';

export const pendingClaimsForCashQueries = {
  byBankWallet: (wallet: string) =>
    ['stealth', 'pending-claims-cash', wallet] as const,
};

/**
 * Scan the indexer for self-claimable UTXOs whose `destinationAddress` is the
 * user's bank wallet — i.e., money waiting to land on bank. Requires both
 * a bank and a stealth wallet to be set up.
 */
export function usePendingClaimsForCash() {
  const { user } = useAuth();
  const bankWallet = user?.bankWallet ?? '';
  const stealfWallet = user?.stealfWallet ?? '';

  return useQuery({
    queryKey: pendingClaimsForCashQueries.byBankWallet(bankWallet),
    queryFn: () => fetchPendingClaimsForCash(bankWallet),
    enabled: !!bankWallet && !!stealfWallet,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
