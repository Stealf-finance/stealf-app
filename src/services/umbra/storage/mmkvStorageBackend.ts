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

/** True if this wallet's namespace already holds persisted store data. */
export function hasMmkvStorageBackendData(namespace: string): boolean {
  const prefix = `${namespace}.`;
  return storage.getAllKeys().some((k) => k.startsWith(prefix));
}

const STORE_MIGRATION_VERSION = 'mmkv-legacy-v4-1';

export async function migrateUmbraStoreIfNeeded(
  namespace: string,
): Promise<void> {
  const flagKey = `umbra-migration.${namespace}`;
  if (storage.getString(flagKey) === STORE_MIGRATION_VERSION) return;
  clearMmkvStorageBackend(namespace);
  await clearAsyncStorageBackend(namespace).catch(() => undefined);
  storage.set(flagKey, STORE_MIGRATION_VERSION);
}
