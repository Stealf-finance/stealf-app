import { getClaimableUtxoScannerFunction } from '@umbra-privacy/sdk';
import { getStealthClient, getCachedSignerKey } from '../client';
import {
  isBurnt,
  loadBurntUtxosForCurrentWallet,
} from '@/src/features/stealth/lib/burntUtxos';

async function ensureBlacklistLoaded(): Promise<void> {
  const key = getCachedSignerKey();
  if (key) await loadBurntUtxosForCurrentWallet(key);
}

/** Raw 4-bucket result of a stealth-wallet UTXO scan, already filtered
 *  against the local "burnt" blacklist. Consumers slice this into UX-specific
 *  views (inbound to encrypted balance vs. self-burnable for cash). */
export type ClaimScanResult = {
  /** Encrypted balance: received from someone else's private send. */
  received: any[];
  /** Encrypted balance: created by a shield (bank → stealth) op. */
  publicReceived: any[];
  /** Self-claimable to a public address you control (typically bank). */
  selfBurnable: any[];
  /** Public variant of selfBurnable. */
  publicSelfBurnable: any[];
};

// Paginated scan parameters. The Umbra SDK doc recommends pagination for
// large trees (`getClaimableUtxoScannerFunction`):
//   - TREE_INDEX 0 is the first Merkle tree; when full the next is 1, etc.
//   - MAX_LEAVES is 2^20 (standard Merkle tree depth 20).
//   - CHUNK_SIZE = leaves processed per scan call. The per-chunk crypto
//     (X25519 ECDH + AES-GCM try-decrypt of each ciphertext) runs
//     synchronously on the JS thread, so this controls how long the JS
//     thread is blocked between yields. 5_000 ≈ 200ms per chunk in dev.
//     A single unbounded `scan(0, 0)` call freezes the thread for tens of
//     seconds — pagination keeps the app interactive throughout.
const TREE_INDEX = 0;
const MAX_LEAVES = 1_048_576;
const CHUNK_SIZE = 5_000;

/**
 * Full Merkle-tree scan for the current stealth signer. Heavy: derives
 * stealth keys and tries to decrypt every UTXO commitment in the tree on
 * the JS thread.
 *
 * Implemented as a loop of fixed-size chunked scans with a `setTimeout(0)`
 * yield between each so taps, animations, and re-renders can interleave
 * during the long crawl. Total work is unchanged vs. a single unbounded
 * `scan(0, 0)` call, but per-chunk thread freeze is ~200ms instead of
 * tens of seconds — the app stays interactive while the scan completes
 * in the background.
 *
 * Run once and let consumers slice the result via React Query `select`
 * (see `useClaimScan`).
 */
export async function fetchClaimScan(): Promise<ClaimScanResult> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });

  const acc = {
    received: [] as any[],
    publicReceived: [] as any[],
    selfBurnable: [] as any[],
    publicSelfBurnable: [] as any[],
  };

  let cursor = 0;
  while (cursor < MAX_LEAVES) {
    const end = Math.min(cursor + CHUNK_SIZE - 1, MAX_LEAVES - 1);
    const chunk = await scan(TREE_INDEX as any, cursor as any, end as any);
    if (chunk.received?.length) acc.received.push(...chunk.received);
    if (chunk.publicReceived?.length) acc.publicReceived.push(...chunk.publicReceived);
    if (chunk.selfBurnable?.length) acc.selfBurnable.push(...chunk.selfBurnable);
    if (chunk.publicSelfBurnable?.length)
      acc.publicSelfBurnable.push(...chunk.publicSelfBurnable);
    cursor += CHUNK_SIZE;
    // setTimeout(0) defers the next chunk to a fresh task, releasing the JS
    // thread so pending taps / React commits / Reanimated worklet callbacks
    // can run. Cheaper than rAF and not tied to the frame loop.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const notBurnt = (u: any) => !isBurnt(u);
  const out: ClaimScanResult = {
    received: acc.received.filter(notBurnt),
    publicReceived: acc.publicReceived.filter(notBurnt),
    selfBurnable: acc.selfBurnable.filter(notBurnt),
    publicSelfBurnable: acc.publicSelfBurnable.filter(notBurnt),
  };
  if (__DEV__) {
    console.log(
      '[claims] scan:' +
        ` received=${out.received.length}` +
        ` publicReceived=${out.publicReceived.length}` +
        ` selfBurnable=${out.selfBurnable.length}` +
        ` publicSelfBurnable=${out.publicSelfBurnable.length}`,
    );
  }
  return out;
}
