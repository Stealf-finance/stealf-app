import { QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import {
  fetchClaimScan,
  type ClaimScanResult,
} from '@/src/services/umbra/queries/claims';
import { loadClaimScanCache } from '@/src/features/stealth/lib/claimScanCache';
import {
  fetchUmbraRegistration,
  umbraRegistrationQueries,
} from '@/src/features/stealth/hooks/useUmbraRegistration';
import { claimScanQueries } from '@/src/features/stealth/hooks/useClaimScan';

export type SyncDecision =
  | { action: 'skip'; reason: 'fresh-create' | 'cache-exists' | 'not-registered' }
  | { action: 'scan' };

/**
 * Decide whether a freshly-set-up stealth wallet needs an eager claim scan
 * before its Claims screen can show accurate counts. Three early-exits keep
 * us out of the 14s scan when it would be guaranteed empty work:
 *
 *   1. `isFresh=true`: the user just generated this wallet, the address has
 *      never been seen by the Umbra protocol — no UTXOs can exist.
 *   2. Local AsyncStorage cache already has a result for this wallet:
 *      that's the authoritative answer from a previous session on this
 *      device; the Claims screen will refresh on demand if stale.
 *   3. The wallet is not registered on Umbra: by protocol design, an
 *      unregistered wallet has no `EncryptedUserAccount` PDA, so no
 *      sender can have encrypted UTXOs to it — guaranteed empty.
 *
 * The Umbra registration check costs a single on-chain account-fetch
 * (~200-500ms), which is the only network round-trip this function makes
 * on the non-trivial path. Far cheaper than the alternative scan.
 */
export async function decideSyncAction(
  walletAddress: string,
  isFresh: boolean,
): Promise<SyncDecision> {
  if (isFresh) return { action: 'skip', reason: 'fresh-create' };

  const cached = await loadClaimScanCache(walletAddress);
  if (cached) return { action: 'skip', reason: 'cache-exists' };

  try {
    const registered = await fetchUmbraRegistration(walletAddress);
    if (!registered) return { action: 'skip', reason: 'not-registered' };
  } catch (err) {
    // If the registration probe itself failed (RPC down, etc.) we fall
    // through to the scan attempt — `runSyncScan` will retry / surface
    // its own failure. Better to try the scan than silently skip and
    // leave the Claims badge wrong.
    Sentry.addBreadcrumb({
      category: 'stealth.sync',
      level: 'warning',
      message: 'Umbra registration probe failed, falling through to scan',
      data: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  return { action: 'scan' };
}

export type ScanRunOptions = {
  /** Called between retries with the attempt index (1-based). */
  onAttempt?: (attempt: number) => void;
  /** Called from `fetchClaimScan` with 0..1 ratio. */
  onProgress?: (ratio: number) => void;
  /**
   * How many times to retry on failure. Default 2 (so up to 3 total
   * attempts). Indexer hiccups during devnet upgrades are real, and the
   * sync overlay is one of the user's first impressions of the app — we
   * want it to succeed without leaving them on a manual retry.
   */
  maxRetries?: number;
};

/**
 * Run `fetchClaimScan` with automatic retries on transient failure. On
 * final exhausted-retry failure, throws — the caller decides whether to
 * surface the error or silently continue. The query-client cache is
 * primed on success so the next `useClaimScan` consumer reads instantly.
 */
export async function runSyncScan(
  queryClient: QueryClient,
  walletAddress: string,
  options: ScanRunOptions = {},
): Promise<ClaimScanResult> {
  const maxRetries = options.maxRetries ?? 2;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    options.onAttempt?.(attempt);
    try {
      const result = await fetchClaimScan(walletAddress, {
        onProgress: options.onProgress,
      });
      queryClient.setQueryData(
        claimScanQueries.byStealfWallet(walletAddress),
        result,
      );
      // Also persist a fresh registration probe result if we got one
      // during the run — saves a duplicate fetch later.
      queryClient.setQueryData(
        umbraRegistrationQueries.byAddress(walletAddress),
        true,
      );
      return result;
    } catch (err) {
      lastErr = err;
      Sentry.addBreadcrumb({
        category: 'stealth.sync',
        level: 'warning',
        message: `Claim scan attempt ${attempt}/${maxRetries + 1} failed`,
        data: { error: err instanceof Error ? err.message : String(err) },
      });
      if (attempt > maxRetries) break;
      // Linear backoff: 1s, 2s, 3s, … Keeps the retries snappy enough
      // for the user staring at the overlay, while still giving the
      // indexer breathing room.
      await new Promise<void>((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw lastErr;
}
