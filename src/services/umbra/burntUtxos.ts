import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

const BURNT_UTXOS_KEY_PREFIX = 'umbra_burnt_utxos_';

const burntUtxoIds = new Set<string>();
/** The hashed SecureStore key name — never the private key itself. */
let loadedStorageKey: string | null = null;

/**
 * SecureStore key names are stored in the Keychain's `kSecAttrAccount`
 * attribute — an indexed, unencrypted column readable via `SecItemCopyMatching`
 * without decrypting the value or triggering the item's ACL. Never derive a key
 * name from secret material. Mirrors `services/umbra/seed.ts`.
 */
export function buildBurntUtxosKey(privateKeyB58: string): string {
  const digest = bytesToHex(sha256(utf8ToBytes(privateKeyB58))).slice(0, 16);
  return `${BURNT_UTXOS_KEY_PREFIX}${digest}`;
}

/**
 * Pre-fix key name — embedded the raw base58 private key verbatim. The
 * sanitizer was a no-op: base58's alphabet is a subset of `[A-Za-z0-9]`, so the
 * character class matched nothing. Kept only to find and delete legacy entries.
 */
export function buildLegacyBurntUtxosKey(privateKeyB58: string): string {
  return `${BURNT_UTXOS_KEY_PREFIX}${privateKeyB58.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

interface UtxoLike {
  treeIndex?: bigint | number | string;
  insertionIndex?: bigint | number | string;
}

interface ClaimBatchLike {
  status?: string;
  failureReason?: string | null;
  utxoIds?: readonly string[];
}

interface ClaimResultLike {
  batches?: Map<unknown, ClaimBatchLike>;
}

export function utxoToId(utxo: UtxoLike): string {
  const tree = utxo?.treeIndex?.toString?.() ?? String(utxo?.treeIndex ?? '0');
  const leaf =
    utxo?.insertionIndex?.toString?.() ?? String(utxo?.insertionIndex ?? '');
  return `${tree}:${leaf}`;
}

export function isBurnt(utxo: UtxoLike): boolean {
  return burntUtxoIds.has(utxoToId(utxo));
}

/** Reset the in-memory blacklist on logout / wallet switch. */
export function clearBurntUtxos(): void {
  burntUtxoIds.clear();
  loadedStorageKey = null;
}

/**
 * One-time move off the leaked key name. The blacklist is a self-healing cache
 * — a lost entry costs one failed claim that `recoverFromAlreadyBurnt` relearns
 * — but the legacy delete must run regardless, since scrubbing the exposed
 * Keychain attribute is the point of the migration.
 */
async function migrateLegacyEntry(
  privateKeyB58: string,
  key: string,
): Promise<string | null> {
  const legacyKey = buildLegacyBurntUtxosKey(privateKeyB58);
  const { getSecure, setSecure, deleteSecure } =
    await import('@/src/services/auth/secureStore');
  let stored: string | null = null;
  try {
    stored = await getSecure(legacyKey);
    if (stored) await setSecure(key, stored);
  } catch {
    // Content migration is best-effort; the delete below still has to run.
  }
  await deleteSecure(legacyKey).catch(() => undefined);
  return stored;
}

export async function loadBurntUtxosForCurrentWallet(
  privateKeyB58: string,
): Promise<void> {
  const key = buildBurntUtxosKey(privateKeyB58);
  if (loadedStorageKey === key) return;
  burntUtxoIds.clear();
  try {
    // Lazy import keeps `expo-secure-store` (and RN) out of the module graph
    // at load time, while still routing through the centralized service.
    const { getSecure } = await import('@/src/services/auth/secureStore');
    const stored =
      (await getSecure(key)) ?? (await migrateLegacyEntry(privateKeyB58, key));
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      for (const id of ids) burntUtxoIds.add(id);
    }
  } catch {
    // Best-effort; missing storage is fine.
  }
  loadedStorageKey = key;
}

export async function persistBurntUtxos(): Promise<void> {
  if (!loadedStorageKey) return;
  try {
    const { setSecure } = await import('@/src/services/auth/secureStore');
    await setSecure(loadedStorageKey, JSON.stringify(Array.from(burntUtxoIds)));
  } catch {
    // Best-effort.
  }
}

function addToBlacklist(id: string): boolean {
  if (burntUtxoIds.has(id)) return false;
  burntUtxoIds.add(id);
  return true;
}

const ALREADY_BURNT_PATTERNS =
  /NullifierAlreadyBurnt|already burnt|already reserved|0x6d64/i;

export function isAlreadyBurntError(err: unknown): boolean {
  const e = err as { message?: string; cause?: { message?: string } };
  // Concat (don't short-circuit) so the cause chain is always inspected.
  const msg = `${e?.message ?? ''} ${e?.cause?.message ?? ''}`;
  return ALREADY_BURNT_PATTERNS.test(msg);
}

/**
 * Walk a claim result, blacklist any UTXOs the chain reports as burnt
 * (success, "already burnt" failure), and persist the updated blacklist.
 * Throws when ALL batches failed for non-burnt reasons.
 */
export async function handleClaimResult(
  result: ClaimResultLike,
  inputUtxos: UtxoLike[],
): Promise<ClaimResultLike> {
  const batches = result?.batches;
  let anySuccess = false;
  let anyAlreadyBurnt = false;
  let blacklistChanged = false;
  const otherFailures: string[] = [];

  if (batches instanceof Map) {
    for (const [, batch] of batches) {
      const status = batch?.status;
      const utxoIds: readonly string[] = batch?.utxoIds ?? [];

      if (status === 'completed') {
        anySuccess = true;
        for (const id of utxoIds) {
          if (addToBlacklist(id)) blacklistChanged = true;
        }
        for (const u of inputUtxos) {
          if (addToBlacklist(utxoToId(u))) blacklistChanged = true;
        }
      } else if (status === 'failed' || status === 'timed_out') {
        const reason = batch?.failureReason ?? '';
        if (ALREADY_BURNT_PATTERNS.test(reason)) {
          anyAlreadyBurnt = true;
          for (const id of utxoIds) {
            if (addToBlacklist(id)) blacklistChanged = true;
          }
        } else {
          otherFailures.push(reason || 'unknown failure');
        }
      }
    }
  }

  if (blacklistChanged) await persistBurntUtxos();

  if (otherFailures.length > 0 && !anySuccess && !anyAlreadyBurnt) {
    throw new Error(otherFailures[0]);
  }

  return result;
}

export async function recoverFromAlreadyBurnt(
  inputUtxos: UtxoLike[],
): Promise<{ batches: Map<unknown, unknown> }> {
  let blacklistChanged = false;
  for (const u of inputUtxos) {
    if (addToBlacklist(utxoToId(u))) blacklistChanged = true;
  }
  if (blacklistChanged) await persistBurntUtxos();
  return { batches: new Map() };
}
