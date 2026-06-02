import { getBurnableStealthPoolNoteScannerFunction } from '@umbra-privacy/sdk/burn';
import { getStealthClient, getCachedSignerKey } from '../client';
import {
  nativeAesDecryptor,
  nativeX25519GetSharedSecretAsync,
  nativeX25519GetPublicKey,
} from '../crypto/nativeCrypto';
import {
  isBurnt,
  loadBurntUtxosForCurrentWallet,
} from '@/src/features/stealth/lib/burntUtxos';

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

let cachedScanner: {
  wallet: string;
  scan: ReturnType<typeof getBurnableStealthPoolNoteScannerFunction>;
} | null = null;

function getOrCreateScanner(
  wallet: string,
  client: Parameters<typeof getBurnableStealthPoolNoteScannerFunction>[0]['client'],
) {
  if (cachedScanner && cachedScanner.wallet === wallet) {
    return cachedScanner.scan;
  }

  const scan = getBurnableStealthPoolNoteScannerFunction(
    { client },
    {
      aesDecryptor: nativeAesDecryptor,
      x25519GetSharedSecret: nativeX25519GetSharedSecretAsync as never,
      x25519GetPublicKey: nativeX25519GetPublicKey as never,
    },
  );
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
  onProgress?: (ratio: number) => void;
};

export async function fetchClaimScan(
  wallet: string,
  options: FetchClaimScanOptions = {},
): Promise<ClaimScanResult> {
  const client = await getStealthClient();
  await ensureBlacklistLoaded();
  const scan = getOrCreateScanner(wallet, client);

  if (options.onProgress) options.onProgress(0);

  const scanT0 = Date.now();
  try {
    await scan();
  } catch (err: any) {
    if (__DEV__) {
      console.error(
        `[claims] scan ABORTED after ${Date.now() - scanT0}ms:`,
        err?.message || err,
      );
    }
    throw err;
  }
  if (options.onProgress) options.onProgress(1);

  const store = (client as unknown as { utxoDataStore?: { query: (f: object) => Promise<any[]> } })
    .utxoDataStore;
  if (!store) {
    if (__DEV__) console.warn('[claims] no utxoDataStore wired — returning empty');
    return emptyResult();
  }

  const allEntries = await store.query({
    network: client.network,
    signerAddress: client.signer.address,
  });

  const out = emptyResult();
  for (const entry of allEntries) {
    if (isBurnt(entry.data)) continue;
    (entry.data as { masterSeedSchemeId?: string }).masterSeedSchemeId =
      entry.masterSeedSchemeId;
    switch (entry.claimType) {
      case 'etaToStealthPoolReceiverBurnable':
        out.received.push(entry.data);
        break;
      case 'ataToStealthPoolReceiverBurnable':
        out.publicReceived.push(entry.data);
        break;
      case 'etaToStealthPoolSelfBurnable':
        out.selfBurnable.push(entry.data);
        break;
      case 'ataToStealthPoolSelfBurnable':
        out.publicSelfBurnable.push(entry.data);
        break;
      default:
        break;
    }
  }

  if (__DEV__) {
    console.log(
      '[claims] scan+query done:' +
        ` totalMs=${Date.now() - scanT0}` +
        ` walletShort=${wallet.slice(0, 8)}` +
        ` received=${out.received.length}` +
        ` publicReceived=${out.publicReceived.length}` +
        ` selfBurnable=${out.selfBurnable.length}` +
        ` publicSelfBurnable=${out.publicSelfBurnable.length}`,
    );
  }

  return out;
}
