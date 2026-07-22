const BURNT_UTXOS_KEY_PREFIX = 'umbra_burnt_utxos_';

const burntUtxoIds = new Set<string>();
let loadedForKey: string | null = null;

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
  loadedForKey = null;
}

export async function loadBurntUtxosForCurrentWallet(
  privateKeyB58: string,
): Promise<void> {
  if (loadedForKey === privateKeyB58) return;
  burntUtxoIds.clear();
  const safe = privateKeyB58.replace(/[^A-Za-z0-9._-]/g, '_');
  try {
    // Lazy import keeps `expo-secure-store` (and RN) out of the module graph
    // at load time, while still routing through the centralized service.
    const [{ getSecure }, { NETWORK }] = await Promise.all([
      import('@/src/services/auth/secureStore'),
      import('@/src/services/umbra/client'),
    ]);
    // Network-scope the key. Burnt-UTXO IDs are positional (tree:leaf) merkle
    // coordinates that reset per Umbra deployment, so a devnet blacklist must
    // NOT be read on mainnet — it would silently hide legitimate mainnet notes
    // landing at indices the wallet already burnt on devnet.
    const key = `${BURNT_UTXOS_KEY_PREFIX}${NETWORK}_${safe}`;
    const stored = await getSecure(key);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      for (const id of ids) burntUtxoIds.add(id);
    }
  } catch {
    // Best-effort; missing storage is fine.
  }
  loadedForKey = privateKeyB58;
}

export async function persistBurntUtxos(): Promise<void> {
  if (!loadedForKey) return;
  const safe = loadedForKey.replace(/[^A-Za-z0-9._-]/g, '_');
  try {
    const [{ setSecure }, { NETWORK }] = await Promise.all([
      import('@/src/services/auth/secureStore'),
      import('@/src/services/umbra/client'),
    ]);
    // Must match the network-scoped key used by loadBurntUtxosForCurrentWallet.
    const key = `${BURNT_UTXOS_KEY_PREFIX}${NETWORK}_${safe}`;
    await setSecure(key, JSON.stringify(Array.from(burntUtxoIds)));
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
