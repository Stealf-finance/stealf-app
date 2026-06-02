import { QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import {
  fetchClaimScan,
  type ClaimScanResult,
} from '@/src/services/umbra/queries/claims';
import { hasMmkvStorageBackendData } from '@/src/services/umbra/storage/mmkvStorageBackend';
import {
  fetchUmbraRegistration,
  umbraRegistrationQueries,
} from '@/src/features/stealth/hooks/useUmbraRegistration';
import { claimScanQueries } from '@/src/features/stealth/hooks/useClaimScan';

export type SyncDecision =
  | { action: 'skip'; reason: 'fresh-create' | 'cache-exists' | 'not-registered' }
  | { action: 'scan' };


export async function decideSyncAction(
  walletAddress: string,
  isFresh: boolean,
): Promise<SyncDecision> {
  if (isFresh) return { action: 'skip', reason: 'fresh-create' };

  const storeWarm = hasMmkvStorageBackendData(walletAddress);
  if (storeWarm) return { action: 'skip', reason: 'cache-exists' };

  try {
    const registered = await fetchUmbraRegistration(walletAddress);
    if (!registered) return { action: 'skip', reason: 'not-registered' };
  } catch (err) {

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
  onAttempt?: (attempt: number) => void;
  onProgress?: (ratio: number) => void;
  maxRetries?: number;
};

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

      await new Promise<void>((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw lastErr;
}
