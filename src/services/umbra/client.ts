import {
  getUmbraClient,
  getPollingComputationMonitor,
  getUmbraRelayer,
  type IUmbraSigner,
} from '@umbra-privacy/sdk';
import {
  createShardedUtxoDataStore,
  createShardedNullifierStore,
} from '@umbra-privacy/sdk/store-adapters';
import { masterSeedSchemeV4 } from '@umbra-privacy/sdk/master-seed-schemes';
import { UMBRA_CONFIG } from './constant';
import { createMasterSeedStorage } from './storage/masterSeed';
import { createMmkvStorageBackend } from './storage/mmkvStorageBackend';
import { clearActiveSigner, getActiveSigner } from './signers/active';

export type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;

const LEGACY_MASTER_SEED_SCHEMES = [masterSeedSchemeV4] as const;

type MasterSeedStorageDep = NonNullable<
  Parameters<typeof getUmbraClient>[1]
>['masterSeedStorage'];

const clientCache = new Map<string, UmbraClient>();
const inFlight = new Map<string, Promise<UmbraClient>>();

async function assembleClient(
  signer: IUmbraSigner,
  namespace: string,
): Promise<UmbraClient> {

  const args = {
    signer,
    network: UMBRA_CONFIG.network,
    rpcUrl: UMBRA_CONFIG.rpcUrl,
    rpcSubscriptionsUrl: UMBRA_CONFIG.rpcSubscriptionsUrl,
    indexerApiEndpoint: UMBRA_CONFIG.indexerApi,
    legacyMasterSeedSchemes: LEGACY_MASTER_SEED_SCHEMES,
  };

  const baseDeps = {
    masterSeedStorage: createMasterSeedStorage(namespace) as MasterSeedStorageDep,
    computationMonitor: getPollingComputationMonitor({
      rpcUrl: UMBRA_CONFIG.rpcUrl,
    }),
  };

  const bareClient = await getUmbraClient(args, baseDeps);

  const backend = createMmkvStorageBackend(namespace);

  const [utxoDataStore, nullifierStore] = await Promise.all([
    createShardedUtxoDataStore(bareClient, backend),
    createShardedNullifierStore(bareClient, backend),
  ]);

  return getUmbraClient(args, { ...baseDeps, utxoDataStore, nullifierStore });
}

export async function getClient(signer: IUmbraSigner): Promise<UmbraClient> {
  const namespace = signer.address.toString();

  const cached = clientCache.get(namespace);
  if (cached) return cached;

  const pending = inFlight.get(namespace);
  if (pending) return pending;

  const build = assembleClient(signer, namespace)
    .then((client) => {
      clientCache.set(namespace, client);
      return client;
    })
    .finally(() => {
      inFlight.delete(namespace);
    });

  inFlight.set(namespace, build);
  return build;
}

export function clearClients(): void {
  clientCache.clear();
  inFlight.clear();
  clearActiveSigner();
}

/**
 * The client for the wallet this device signs with — the Turnkey bank wallet.
 * Reads the signer `useUmbraSigner` installed at mount, so service-layer callers
 * stay free of React. Throws until Turnkey has hydrated.
 */
export async function getActiveClient(): Promise<UmbraClient> {
  return getClient(getActiveSigner());
}

export function getRelayer() {
  return getUmbraRelayer({ apiEndpoint: UMBRA_CONFIG.relayerApi });
}
