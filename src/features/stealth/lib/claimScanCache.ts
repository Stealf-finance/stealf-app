import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClaimScanResult } from '@/src/services/umbra/queries/claims';

/**
 * Persistent claim-scan cache.
 *
 * The Umbra claimable-UTXO scanner has to crawl the full Merkle tree and
 * try-decrypt every ciphertext to find which ones belong to the current
 * signer. The first run for a wallet pays the full cost (~tens of seconds).
 * On subsequent app launches we'd repeat the same work for no reason — the
 * tree has only grown, the previously-scanned range hasn't changed.
 *
 * This module persists `{ cursor, results }` per stealf wallet so the next
 * scan can:
 *   - Render the badge instantly from cached results
 *   - Resume scanning from the saved cursor (delta scan only the new leaves)
 *
 * Stored in AsyncStorage rather than SecureStore because:
 *   - The data set may be large (kilobytes for active wallets); SecureStore
 *     on iOS has practical per-key size limits.
 *   - The cached UTXOs are not more sensitive than the public balance the
 *     app already renders — there's no incremental privacy loss from
 *     persisting them in the app sandbox.
 *   - Anyone with device-level access to AsyncStorage also has access to
 *     the private key in SecureStore, which is strictly more useful.
 */

const STORAGE_KEY_PREFIX = 'stealf.claim-scan.';
const SCHEMA_VERSION = 1;

export type ClaimScanCacheEntry = {
  schemaVersion: number;
  /** Which Merkle tree this cursor refers to. Bumped if tree 0 fills up. */
  treeIndex: number;
  /**
   * Next insertion index to scan from (exclusive of what's been scanned).
   * `cursor === MAX_LEAVES` means we've finished crawling the current tree.
   */
  cursor: number;
  /** Cumulative scan result across all leaves up to `cursor`. */
  results: ClaimScanResult;
  /** Wall-clock timestamp of when this state was saved. Diagnostics only. */
  scannedAt: number;
};

function keyFor(wallet: string): string {
  return STORAGE_KEY_PREFIX + wallet;
}

export async function loadClaimScanCache(
  wallet: string,
): Promise<ClaimScanCacheEntry | null> {
  if (!wallet) return null;
  try {
    const raw = await AsyncStorage.getItem(keyFor(wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClaimScanCacheEntry;
    // Future schema migrations would land here; for now, anything other
    // than v1 is treated as missing so we re-scan from 0.
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch (err) {
    if (__DEV__) console.warn('[claim-scan-cache] load failed:', err);
    return null;
  }
}

export async function saveClaimScanCache(
  wallet: string,
  entry: Omit<ClaimScanCacheEntry, 'schemaVersion' | 'scannedAt'>,
): Promise<void> {
  if (!wallet) return;
  try {
    const full: ClaimScanCacheEntry = {
      schemaVersion: SCHEMA_VERSION,
      ...entry,
      scannedAt: Date.now(),
    };
    await AsyncStorage.setItem(keyFor(wallet), JSON.stringify(full));
  } catch (err) {
    if (__DEV__) console.warn('[claim-scan-cache] save failed:', err);
  }
}

export async function clearClaimScanCache(wallet: string): Promise<void> {
  if (!wallet) return;
  try {
    await AsyncStorage.removeItem(keyFor(wallet));
  } catch {
    // No-op: corruption / IO errors are non-fatal here, the next scan
    // will simply rebuild state from scratch.
  }
}
