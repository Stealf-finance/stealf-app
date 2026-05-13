import { useClaimScan } from './useClaimScan';
import type { ClaimScanResult } from '@/src/services/umbra/queries/claims';

// Stable module-level reference so React Query can memoize the select result.
const selectInbound = (r: ClaimScanResult) => [
  ...r.received,
  ...r.publicReceived,
];

/**
 * UTXOs received by the current stealth wallet that are still claimable into
 * encrypted balance — i.e. inbound private transfers + shields-in-flight.
 * Derived slice of `useClaimScan` so the underlying scan runs once.
 */
export function usePendingClaims() {
  return useClaimScan(selectInbound);
}
