import { useClaimScan, type UseClaimScanOptions } from './useClaimScan';
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
 *
 * Auto-fetch is opt-in: pass `{ fetch: true }` from screens that own the
 * pending-claims truth (`ClaimPendingScreen`). Defaults to cache-only read,
 * which is what the StealthHub badge wants — see `useClaimScan` docs.
 */
export function usePendingClaims(options?: UseClaimScanOptions) {
  return useClaimScan(selectInbound, options);
}
