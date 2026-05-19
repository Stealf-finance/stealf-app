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

let cachedScanner: {
  wallet: string;
  scan: ReturnType<typeof getClaimableUtxoScannerFunction>;
} | null = null;

function getOrCreateScanner(
  wallet: string,
  client: Parameters<typeof getClaimableUtxoScannerFunction>[0]['client'],
) {
  if (cachedScanner && cachedScanner.wallet === wallet) {
    return cachedScanner.scan;
  }
  const scan = getClaimableUtxoScannerFunction({ client });
  cachedScanner = { wallet, scan };
  return scan;
}

/** Resets the cached scanner. Call on logout / wallet switch. */
export function clearClaimScanner(): void {
  cachedScanner = null;
}

function emptyResult(): ClaimScanResult {
  return {
    received: [],
    publicReceived: [],
    selfBurnable: [],
    publicSelfBurnable: [],
  };
}

export type FetchClaimScanOptions = {
  /** Called after each scanned chunk with a 0..1 ratio of progress. */
  onProgress?: (ratio: number) => void;
};

export async function fetchClaimScan(
  wallet: string,
  options: FetchClaimScanOptions = {},
): Promise<ClaimScanResult> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getOrCreateScanner(wallet, client);

  const cache = wallet ? await loadClaimScanCache(wallet) : null;
  const baseTreeIndex = cache?.treeIndex ?? TREE_INDEX;

  const startCursor = cache?.cursor ?? 0;
  const seedResults = cache?.results ?? emptyResult();
  if (__DEV__) {
    console.log(
      '[claims] fetchClaimScan start:' +
        ` walletShort=${wallet.slice(0, 8)}` +
        ` cacheHit=${!!cache}` +
        ` startCursor=${startCursor}` +
        ` seedReceived=${seedResults.received.length}` +
        ` seedPublicReceived=${seedResults.publicReceived.length}` +
        ` seedSelfBurnable=${seedResults.selfBurnable.length}` +
        ` seedPublicSelfBurnable=${seedResults.publicSelfBurnable.length}`,
    );
  }

  const acc: ClaimScanResult = {
    received: [...seedResults.received],
    publicReceived: [...seedResults.publicReceived],
    selfBurnable: [...seedResults.selfBurnable],
    publicSelfBurnable: [...seedResults.publicSelfBurnable],
  };

  let cursor = startCursor;
  let lastScannedEnd = startCursor;
  let chunkIndex = 0;
  const scanT0 = Date.now();
  try {
    while (cursor < MAX_LEAVES) {
      const end = Math.min(cursor + CHUNK_SIZE - 1, MAX_LEAVES - 1);
      const chunkT0 = Date.now();
      const chunk = await scan(
        BigInt(baseTreeIndex) as any,
        BigInt(cursor) as any,
        BigInt(end) as any,
      );
      const chunkMs = Date.now() - chunkT0;
      if (chunk.received?.length) acc.received.push(...chunk.received);
      if (chunk.publicReceived?.length)
        acc.publicReceived.push(...chunk.publicReceived);
      if (chunk.selfBurnable?.length) acc.selfBurnable.push(...chunk.selfBurnable);
      if (chunk.publicSelfBurnable?.length)
        acc.publicSelfBurnable.push(...chunk.publicSelfBurnable);

      const nextCursor = Number(chunk.nextScanStartIndex);
      lastScannedEnd = nextCursor;
      chunkIndex++;

      if (__DEV__ && (chunkIndex % 20 === 0 || chunkMs > 800)) {
        console.log(
          `[claims] chunk #${chunkIndex} done cursor=${cursor}→${nextCursor}` +
            ` chunkMs=${chunkMs} totalMs=${Date.now() - scanT0}` +
            ` running totals received=${acc.received.length}` +
            ` publicReceived=${acc.publicReceived.length}` +
            ` selfBurnable=${acc.selfBurnable.length}` +
            ` publicSelfBurnable=${acc.publicSelfBurnable.length}`,
        );
      }

      if (options.onProgress) {
        const ratio = Math.min(1, Math.max(0, nextCursor / MAX_LEAVES));
        options.onProgress(ratio);
      }

      if (nextCursor <= cursor) break;
      cursor = nextCursor;

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    // Ensure we end at 100% on the success path — the loop above might
    // break on `nextScanStartIndex <= cursor` (tree head reached) before
    // `cursor / MAX_LEAVES` hits exactly 1, leaving the bar partial.
    if (options.onProgress) options.onProgress(1);
  } catch (err: any) {
    if (__DEV__) {
      console.error(
        `[claims] scan ABORTED at chunk #${chunkIndex} cursor=${cursor}` +
          ` after ${Date.now() - scanT0}ms:`,
        err?.message || err,
      );
    }
    throw err;
  }


  const notBurnt = (u: any) => !isBurnt(u);
  const out: ClaimScanResult = {
    received: acc.received.filter(notBurnt),
    publicReceived: acc.publicReceived.filter(notBurnt),
    selfBurnable: acc.selfBurnable.filter(notBurnt),
    publicSelfBurnable: acc.publicSelfBurnable.filter(notBurnt),
  };

  if (wallet) {
    // Persist whatever cursor the SDK last gave us. With `nextScanStartIndex`
    // this naturally tracks the actual tree head, so subsequent scans only
    // touch leaves that were appended since (typically zero or one chunk).
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
