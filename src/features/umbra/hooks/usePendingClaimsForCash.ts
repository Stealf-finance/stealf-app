import { useCallback } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useClaimScan, type UseClaimScanOptions } from './useClaimScan';
import type { ClaimScanResult } from '@/src/services/umbra/queries/claims';

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
