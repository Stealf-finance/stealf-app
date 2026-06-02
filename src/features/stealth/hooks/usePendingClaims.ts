import { useClaimScan, type UseClaimScanOptions } from './useClaimScan';
import type { ClaimScanResult } from '@/src/services/umbra/queries/claims';

const selectInbound = (r: ClaimScanResult) => [
  ...r.received,
  ...r.publicReceived,
];

export function usePendingClaims(options?: UseClaimScanOptions) {
  return useClaimScan(selectInbound, options);
}
