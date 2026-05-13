import { useCallback } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useClaimScan, type UseClaimScanOptions } from './useClaimScan';
import type { ClaimScanResult } from '@/src/services/umbra/queries/claims';

/**
 * Self-claimable UTXOs whose `destinationAddress` is the user's bank wallet —
 * i.e. money waiting to land on bank. Derived slice of `useClaimScan` so the
 * underlying scan runs once across both pending-claim views.
 *
 * Auto-fetch is opt-in: pass `{ fetch: true }` from screens that own the
 * pending-claims truth (`ClaimsScreen`). Defaults to cache-only read — see
 * `useClaimScan` docs for the rationale.
 */
export function usePendingClaimsForCash(options?: UseClaimScanOptions) {
  const { user } = useAuth();
  const bankAddr = user?.bankWallet ?? '';

  const select = useCallback(
    (r: ClaimScanResult) => {
      if (!bankAddr) return [] as any[];
      const candidates = [...r.selfBurnable, ...r.publicSelfBurnable];
      return candidates.filter((u: any) => {
        const dest =
          u?.destinationAddress?.toString?.() ??
          String(u?.destinationAddress ?? '');
        return dest === bankAddr;
      });
    },
    [bankAddr],
  );

  return useClaimScan(select, options);
}
