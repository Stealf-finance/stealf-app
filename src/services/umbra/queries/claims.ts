import { getClaimableUtxoScannerFunction } from '@umbra-privacy/sdk';
import { getStealthClient, getCachedSignerKey } from '../client';
import {
  isBurnt,
  loadBurntUtxosForCurrentWallet,
} from '@/src/features/stealth/lib/burntUtxos';
import {
  loadClaimScanCache,
  saveClaimScanCache,
} from '@/src/features/stealth/lib/claimScanCache';

async function ensureBlacklistLoaded(): Promise<void> {
  const key = getCachedSignerKey();
  if (key) await loadBurntUtxosForCurrentWallet(key);
}

export type ClaimScanResult = {
  received: any[];
  publicReceived: any[];
  selfBurnable: any[];
  publicSelfBurnable: any[];
};

const TREE_INDEX = 0;
const MAX_LEAVES = 1_048_576;
const CHUNK_SIZE = 5_000;

function emptyResult(): ClaimScanResult {
  return {
    received: [],
    publicReceived: [],
    selfBurnable: [],
    publicSelfBurnable: [],
  };
}

export async function fetchClaimScan(wallet: string): Promise<ClaimScanResult> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getClaimableUtxoScannerFunction({ client });

  const cache = wallet ? await loadClaimScanCache(wallet) : null;
  const baseTreeIndex = cache?.treeIndex ?? TREE_INDEX;
  const startCursor = cache?.cursor ?? 0;
  const seedResults = cache?.results ?? emptyResult();

  const acc: ClaimScanResult = {
    received: [...seedResults.received],
    publicReceived: [...seedResults.publicReceived],
    selfBurnable: [...seedResults.selfBurnable],
    publicSelfBurnable: [...seedResults.publicSelfBurnable],
  };

  let cursor = startCursor;
  let lastScannedEnd = startCursor;
  while (cursor < MAX_LEAVES) {
    const end = Math.min(cursor + CHUNK_SIZE - 1, MAX_LEAVES - 1);
    const chunk = await scan(baseTreeIndex as any, cursor as any, end as any);
    if (chunk.received?.length) acc.received.push(...chunk.received);
    if (chunk.publicReceived?.length)
      acc.publicReceived.push(...chunk.publicReceived);
    if (chunk.selfBurnable?.length) acc.selfBurnable.push(...chunk.selfBurnable);
    if (chunk.publicSelfBurnable?.length)
      acc.publicSelfBurnable.push(...chunk.publicSelfBurnable);
    lastScannedEnd = end + 1;
    cursor += CHUNK_SIZE;

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }


  const notBurnt = (u: any) => !isBurnt(u);
  const out: ClaimScanResult = {
    received: acc.received.filter(notBurnt),
    publicReceived: acc.publicReceived.filter(notBurnt),
    selfBurnable: acc.selfBurnable.filter(notBurnt),
    publicSelfBurnable: acc.publicSelfBurnable.filter(notBurnt),
  };

  if (wallet) {
    await saveClaimScanCache(wallet, {
      treeIndex: baseTreeIndex,
      cursor: lastScannedEnd,
      results: out,
    });
  }

  if (__DEV__) {
    console.log(
      '[claims] scan:' +
        ` start=${startCursor}` +
        ` end=${lastScannedEnd}` +
        ` received=${out.received.length}` +
        ` publicReceived=${out.publicReceived.length}` +
        ` selfBurnable=${out.selfBurnable.length}` +
        ` publicSelfBurnable=${out.publicSelfBurnable.length}`,
    );
  }
  return out;
}
