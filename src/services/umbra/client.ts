import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUmbraRelayer,
} from '@umbra-privacy/sdk';
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

export const NETWORK = 'devnet' as const;
export const RELAYER_API = 'https://relayer.api-devnet.umbraprivacy.com';
export const INDEXER_API = 'https://utxo-indexer.api-devnet.umbraprivacy.com';

export type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;

let cachedClient: UmbraClient | null = null;
let cachedSignerKey: string | null = null;
// Single in-flight build shared across parallel callers — without this,
// two parallel `getStealthClient()` calls (e.g. fanning Umbra registration
// queries at boot) each run a full SDK init independently.
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
    // Some legacy keys are stored as the 32-byte seed only; reconstruct the
    // full 64-byte ed25519 secret key by deriving the public half.
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

  cachedClient = await getUmbraClient(
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

  cachedSignerKey = privateKeyB58;
  return cachedClient;
}

/**
 * Build (or fetch from cache) an `UmbraClient` whose signer is the user's
 * stealth wallet (local ed25519 key from walletKeyCache). Cached per private
 * key — if the active key changes, the client is rebuilt. Parallel callers
 * share the same in-flight build instead of racing.
 */
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

/**
 * Reset the stealth client cache. Called on logout / wallet switch so the
 * next `getStealthClient()` rebuilds with the new keys.
 */
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

/**
 * Build (or fetch from cache) an `UmbraClient` whose signer is the user's
 * bank wallet via Turnkey. Cached per bank wallet address.
 */
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
