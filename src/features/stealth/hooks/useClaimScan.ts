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
  /**
   * Whether this consumer should trigger a fetch when the cache is empty.
   * Defaults to `false`: most consumers (badges, derived counts) only want
   * to read whatever is currently cached. Screens that own the truth of
   * pending claims (`ClaimPendingScreen`, `ClaimsScreen`) opt into a
   * fresh fetch via `{ fetch: true }`. The cache itself is warmed once at
   * boot by `DataBootstrap`.
   *
   * Why we don't fetch by default: the underlying scan walks the full
   * Merkle tree and does tens of seconds of crypto on the JS thread,
   * even for accounts with zero claimable UTXOs. Letting any screen
   * mount casually trigger that is the single biggest source of perceived
   * app lag we've measured.
   */
  fetch?: boolean;
};

/**
 * Shared low-level scan of claimable UTXOs for the current stealth wallet.
 *
 * `usePendingClaims` and `usePendingClaimsForCash` derive their UX-specific
 * slices from this via React Query `select`. The underlying query runs once
 * per cache window — pagination + JS-thread yields inside `fetchClaimScan`
 * keep the app responsive while the scan crawls.
 *
 * Auto-fetch is opt-in (see `UseClaimScanOptions.fetch`). Stale cache is
 * served indefinitely; cache invalidation happens via:
 *   - Boot warmup in `DataBootstrap` (one-shot per session)
 *   - Explicit `{ fetch: true }` from `ClaimPendingScreen` / `ClaimsScreen`
 *   - `queryClient.invalidateQueries` after a Move / Claim mutation
 */
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
