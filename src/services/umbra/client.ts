import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUmbraRelayer,
} from '@umbra-privacy/sdk';
import {
  createShardedUtxoDataStore,
  createShardedNullifierStore,
} from '@umbra-privacy/sdk/store-adapters';
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
import { createAsyncStorageBackend } from './storage/asyncStorageBackend';

export const NETWORK = 'devnet' as const;
export const RELAYER_API = 'https://relayer.api-devnet.umbraprivacy.com';
export const INDEXER_API = 'https://utxo-indexer.api-devnet.umbraprivacy.com';

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

  const env = getEnv();
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

  const client = await getUmbraClient(
    {
      signer,
      network: NETWORK,
      rpcUrl: env.EXPO_PUBLIC_SOLANA_RPC_URL,
      rpcSubscriptionsUrl: env.EXPO_PUBLIC_SOLANA_WSS_URL,
      indexerApiEndpoint: INDEXER_API,
    },
    {
      masterSeedStorage: {
        load: masterSeedStorage.load as never,
        store: masterSeedStorage.store as never,
      },
    },
  );

  // Chicken-and-egg: the sharded stores derive their encryption key from the
  // client's master seed, so the client must exist first; but the client
  // exposes the stores at scan time via `client.utxoDataStore`. The client
  // object is plain (not frozen), so we attach the stores post-construction.
  await attachShardedStores(client, signer.address.toString());

  cachedClient = client;
  cachedSignerKey = privateKeyB58;
  return cachedClient;
}

async function attachShardedStores(
  client: UmbraClient,
  namespace: string,
): Promise<void> {
  const backend = createAsyncStorageBackend(namespace);
  const [utxoDataStore, nullifierStore] = await Promise.all([
    createShardedUtxoDataStore(client as never, backend),
    createShardedNullifierStore(client as never, backend),
  ]);
  (client as unknown as { utxoDataStore: unknown }).utxoDataStore = utxoDataStore;
  (client as unknown as { nullifierStore: unknown }).nullifierStore = nullifierStore;
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

  const env = getEnv();
  const signer = createTurnkeyUmbraSigner({
    walletAccount: args.walletAccount,
    signTransaction: args.signTransaction,
    signMessage: args.signMessage,
  });

  const seedStorage = createMasterSeedStorage(addr);

  const client = await getUmbraClient(
    {
      signer,
      network: NETWORK,
      rpcUrl: env.EXPO_PUBLIC_SOLANA_RPC_URL,
      rpcSubscriptionsUrl: env.EXPO_PUBLIC_SOLANA_WSS_URL,
      indexerApiEndpoint: INDEXER_API,
    },
    {
      masterSeedStorage: {
        load: seedStorage.load as never,
        store: seedStorage.store as never,
      },
    },
  );

  await attachShardedStores(client, addr);

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
