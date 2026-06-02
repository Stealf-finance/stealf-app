import {
  createSignerFromPrivateKeyBytes,
  getPollingComputationMonitor,
  getUmbraClient,
  getUmbraRelayer,
} from '@umbra-privacy/sdk';
import {
  createShardedUtxoDataStore,
  createShardedNullifierStore,
} from '@umbra-privacy/sdk/store-adapters';
import { masterSeedSchemeV4 } from '@umbra-privacy/sdk/master-seed-schemes';
import bs58 from 'bs58';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { getEnv } from '@/src/services/env';
import {
  createMasterSeedStorage,
  masterSeedStorage,
  setActiveWallet,
} from './seed';
import {
  createTurnkeyUmbraSigner,
  type TurnkeySignMessageFn,
  type TurnkeySignTransactionFn,
  type TurnkeyWalletAccount,
} from './turnkeySigner';
import {
  createMmkvStorageBackend,
  migrateUmbraStoreIfNeeded,
} from './storage/mmkvStorageBackend';

export const NETWORK = 'devnet' as const;
export const RELAYER_API = 'https://relayer.api-devnet.umbraprivacy.com';
export const INDEXER_API = 'https://utxo-indexer.api-devnet.umbraprivacy.com';

const LEGACY_MASTER_SEED_SCHEMES = [masterSeedSchemeV4] as const;

export type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;

let cachedClient: UmbraClient | null = null;
let cachedSignerKey: string | null = null;

let inFlightClient: Promise<UmbraClient> | null = null;

export function getCachedSignerKey(): string | null {
  return cachedSignerKey;
}

async function buildStealthClient(): Promise<UmbraClient> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) {
    throw new Error('No stealth wallet key — wallet setup required');
  }

  setActiveWallet(privateKeyB58);

  if (cachedSignerKey && cachedSignerKey !== privateKeyB58) {
    cachedClient = null;
  }
  if (cachedClient) return cachedClient;

  const keyBytes = bs58.decode(privateKeyB58);

  let signer;
  if (keyBytes.length === 64) {
    signer = await createSignerFromPrivateKeyBytes(keyBytes);
  } else {
  
    const { createKeyPairFromPrivateKeyBytes } = await import('@solana/kit');
    const cryptoKeyPair = await createKeyPairFromPrivateKeyBytes(keyBytes);
    const pubKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', cryptoKeyPair.publicKey),
    );
    const fullKeyBytes = new Uint8Array(64);
    fullKeyBytes.set(keyBytes, 0);
    fullKeyBytes.set(pubKeyRaw, 32);
    signer = await createSignerFromPrivateKeyBytes(fullKeyBytes);
  }

  const client = await assembleClient(
    signer,
    { load: masterSeedStorage.load, store: masterSeedStorage.store },
    signer.address.toString(),
  );

  cachedClient = client;
  cachedSignerKey = privateKeyB58;
  return cachedClient;
}

interface SeedStorageLike {
  load: unknown;
  store: unknown;
}


async function assembleClient(
  signer: unknown,
  seedStorage: SeedStorageLike,
  namespace: string,
): Promise<UmbraClient> {
  const env = getEnv();
  const args = {
    signer,
    network: NETWORK,
    rpcUrl: env.EXPO_PUBLIC_SOLANA_RPC_URL,
    rpcSubscriptionsUrl: env.EXPO_PUBLIC_SOLANA_WSS_URL,
    indexerApiEndpoint: INDEXER_API,
    legacyMasterSeedSchemes: LEGACY_MASTER_SEED_SCHEMES,
  };
  const computationMonitor = getPollingComputationMonitor({
    rpcUrl: env.EXPO_PUBLIC_SOLANA_RPC_URL,
  } as never);
  const baseDeps = {
    masterSeedStorage: { load: seedStorage.load, store: seedStorage.store },
    computationMonitor,
  };

  const bareClient = await getUmbraClient(args as never, baseDeps as never);

  // One-time wipe of stale scan progress (legacy scheme + native crypto were
  // not in effect when earlier ranges were marked scanned). Runs before the
  // sharded stores load their persisted shards.
  await migrateUmbraStoreIfNeeded(namespace);

  const backend = createMmkvStorageBackend(namespace);
  const [utxoDataStore, nullifierStore] = await Promise.all([
    createShardedUtxoDataStore(bareClient as never, backend),
    createShardedNullifierStore(bareClient as never, backend),
  ]);

  return getUmbraClient(args as never, {
    ...baseDeps,
    utxoDataStore,
    nullifierStore,
  } as never);
}

// Cached per private key; parallel callers share the in-flight build.
export async function getStealthClient(): Promise<UmbraClient> {
  if (cachedClient) return cachedClient;
  if (inFlightClient) return inFlightClient;
  inFlightClient = buildStealthClient();
  try {
    return await inFlightClient;
  } finally {
    inFlightClient = null;
  }
}

export function clearStealthClient(): void {
  cachedClient = null;
  cachedSignerKey = null;
  inFlightClient = null;
}

const bankClientCache = new Map<string, UmbraClient>();

export interface GetBankClientArgs {
  walletAccount: TurnkeyWalletAccount;
  signTransaction: TurnkeySignTransactionFn;
  signMessage: TurnkeySignMessageFn;
}

// Cached per bank wallet address.
export async function getBankClient(
  args: GetBankClientArgs,
): Promise<UmbraClient> {
  const addr = args.walletAccount.address;
  const cached = bankClientCache.get(addr);
  if (cached) return cached;

  const signer = createTurnkeyUmbraSigner({
    walletAccount: args.walletAccount,
    signTransaction: args.signTransaction,
    signMessage: args.signMessage,
  });

  const seedStorage = createMasterSeedStorage(addr);

  const client = await assembleClient(
    signer,
    { load: seedStorage.load, store: seedStorage.store },
    addr,
  );

  bankClientCache.set(addr, client);
  return client;
}

export function clearBankClient(walletAddress?: string): void {
  if (walletAddress) bankClientCache.delete(walletAddress);
  else bankClientCache.clear();
}

export function getRelayer() {
  return getUmbraRelayer({ apiEndpoint: RELAYER_API } as never);
}
