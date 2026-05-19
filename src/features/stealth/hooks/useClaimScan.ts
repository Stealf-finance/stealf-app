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

export type UseClaimScanOptions = {
  fetch?: boolean;
};

export function useClaimScan<TSelect = ClaimScanResult>(
  select?: (r: ClaimScanResult) => TSelect,
  options: UseClaimScanOptions = {},
) {
  const { user } = useAuth();
  const wallet = user?.stealfWallet ?? '';

  return useQuery({
    queryKey: claimScanQueries.byStealfWallet(wallet),
    queryFn: () => fetchClaimScan(wallet),
    enabled: !!wallet && (options.fetch ?? false),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select,
  });
}
