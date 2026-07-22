import { createMMKV } from 'react-native-mmkv';
import type { StorageBackend } from '@umbra-privacy/sdk/store-adapters';
import { clearAsyncStorageBackend } from './asyncStorageBackend';

const storage = createMMKV({ id: 'umbra-store' });

export function createMmkvStorageBackend(namespace: string): StorageBackend {
  const prefix = `${namespace}.`;

  return {
    async read(key: string): Promise<Uint8Array | null> {
      const buf = storage.getBuffer(prefix + key);
      return buf ? new Uint8Array(buf) : null;
    },
    async write(key: string, data: Uint8Array): Promise<void> {
      storage.set(prefix + key, new Uint8Array(data).buffer);
    },
    async delete(key: string): Promise<void> {
      storage.remove(prefix + key);
    },
  };
}

/** Wipe every blob under this wallet's namespace. */
export function clearMmkvStorageBackend(namespace: string): void {
  const prefix = `${namespace}.`;
  for (const k of storage.getAllKeys()) {
    if (k.startsWith(prefix)) storage.remove(k);
  }
}

/**
 * Wipe the ENTIRE Umbra MMKV store — every wallet namespace's UTXO/nullifier
 * shards plus the migration flags. Used on account deletion so no persisted
 * private-balance state survives on the device.
 */
export function clearAllUmbraMmkvStore(): void {
  for (const k of storage.getAllKeys()) storage.remove(k);
}

/** True if this wallet's namespace already holds persisted store data. */
export function hasMmkvStorageBackendData(namespace: string): boolean {
  const prefix = `${namespace}.`;
  return storage.getAllKeys().some((k) => k.startsWith(prefix));
}

// Bumped for the devnet→mainnet flip: the wipe keys ONLY on this constant (not
// on the Umbra NETWORK), and the mainnet build keeps the same bundle id + wallet
// address, so bumping this is the ONLY thing that forces a clean re-scan and
// clears stale devnet UTXO/nullifier state. Do not revert.
const STORE_MIGRATION_VERSION = 'mmkv-mainnet-v1';

export async function migrateUmbraStoreIfNeeded(
  namespace: string,
): Promise<void> {
  const flagKey = `umbra-migration.${namespace}`;
  if (storage.getString(flagKey) === STORE_MIGRATION_VERSION) return;
  clearMmkvStorageBackend(namespace);
  await clearAsyncStorageBackend(namespace).catch(() => undefined);
  storage.set(flagKey, STORE_MIGRATION_VERSION);
}
