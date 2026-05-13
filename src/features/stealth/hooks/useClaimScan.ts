import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  fetchClaimScan,
  type ClaimScanResult,
} from '@/src/services/umbra/queries/claims';

export const claimScanQueries = {
  byStealfWallet: (wallet: string) =>
    ['stealth', 'claim-scan', wallet] as const,
};

/**
 * Shared low-level scan of claimable UTXOs for the current stealth wallet.
 * Runs once per cache window — `usePendingClaims` and `usePendingClaimsForCash`
 * derive their UX-specific slices from this via React Query `select`.
 *
 * Fetched on-demand (no polling). The scan derives stealth keys + decrypts
 * commitments on the JS thread; running it periodically caused multi-second
 * freezes app-wide.
 */
export function useClaimScan<TSelect = ClaimScanResult>(
  select?: (r: ClaimScanResult) => TSelect,
) {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? '';

  return useQuery({
    queryKey: claimScanQueries.byStealfWallet(wallet),
    queryFn: fetchClaimScan,
    enabled: !!wallet,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    select,
  });
}
