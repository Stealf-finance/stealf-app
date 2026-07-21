import { createMMKV } from 'react-native-mmkv';
import type { StorageBackend } from '@umbra-privacy/sdk/store-adapters';
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import { clearAsyncStorageBackend } from './asyncStorageBackend';

const STORE_ID = 'umbra-store-v2';
const LEGACY_PLAINTEXT_STORE_ID = 'umbra-store';
const ENCRYPTION_KEY_NAME = 'umbra_store_encryption_key';

type Mmkv = ReturnType<typeof createMMKV>;

let storagePromise: Promise<Mmkv> | null = null;

async function loadOrCreateEncryptionKey(): Promise<string> {
  const { getSecure, setSecure } =
    await import('@/src/services/auth/secureStore');
  const existing = await getSecure(ENCRYPTION_KEY_NAME);
  if (existing) return existing;
  const key = bytesToHex(randomBytes(32));
  await setSecure(ENCRYPTION_KEY_NAME, key);
  return key;
}

/**
 * One-time removal of the pre-encryption store. Its contents are a re-scannable
 * cache, so dropping it costs a single merkle-tree scan — cheap next to leaving
 * the plaintext transaction graph on disk.
 */
function dropLegacyPlaintextStore(): void {
  try {
    createMMKV({ id: LEGACY_PLAINTEXT_STORE_ID }).clearAll();
  } catch {
    // Already gone, or unreadable — nothing to salvage either way.
  }
}

/**
 * The store holds *decrypted* UTXOs and nullifiers — the user's entire private
 * transaction graph, which is precisely what this product exists to protect. It
 * must not sit unencrypted in the app container, so the instance is built lazily:
 * the encryption key lives in the Keychain and can only be read asynchronously.
 */
function getStorage(): Promise<Mmkv> {
  storagePromise ??= (async () => {
    const encryptionKey = await loadOrCreateEncryptionKey();
    const storage = createMMKV({ id: STORE_ID, encryptionKey });
    dropLegacyPlaintextStore();
    return storage;
  })();
  return storagePromise;
}

export function createMmkvStorageBackend(namespace: string): StorageBackend {
  const prefix = `${namespace}.`;

  return {
    async read(key: string): Promise<Uint8Array | null> {
      const storage = await getStorage();
      const buf = storage.getBuffer(prefix + key);
      return buf ? new Uint8Array(buf) : null;
    },
    async write(key: string, data: Uint8Array): Promise<void> {
      const storage = await getStorage();
      storage.set(prefix + key, new Uint8Array(data).buffer);
    },
    async delete(key: string): Promise<void> {
      const storage = await getStorage();
      storage.remove(prefix + key);
    },
  };
}

/** Wipe every blob under this wallet's namespace. */
export async function clearMmkvStorageBackend(
  namespace: string,
): Promise<void> {
  const storage = await getStorage();
  const prefix = `${namespace}.`;
  for (const k of storage.getAllKeys()) {
    if (k.startsWith(prefix)) storage.remove(k);
  }
}

/**
 * Wipe the whole store and discard its encryption key, for logout and account
 * deletion where no namespace is at hand. Without this the previous user's
 * decrypted note history survives on a shared or resold device.
 */
export async function clearAllMmkvStorageBackend(): Promise<void> {
  try {
    const storage = await getStorage();
    storage.clearAll();
  } catch {
    // Best-effort; the key removal below is what makes the data unreadable.
  }
  const { deleteSecure } = await import('@/src/services/auth/secureStore');
  await deleteSecure(ENCRYPTION_KEY_NAME).catch(() => undefined);
  // Force the next access to mint a fresh key rather than reuse the dropped one.
  storagePromise = null;
}

/** True if this wallet's namespace already holds persisted store data. */
export async function hasMmkvStorageBackendData(
  namespace: string,
): Promise<boolean> {
  const storage = await getStorage();
  const prefix = `${namespace}.`;
  return storage.getAllKeys().some((k) => k.startsWith(prefix));
}

const STORE_MIGRATION_VERSION = 'mmkv-legacy-v4-1';

export async function migrateUmbraStoreIfNeeded(
  namespace: string,
): Promise<void> {
  const storage = await getStorage();
  const flagKey = `umbra-migration.${namespace}`;
  if (storage.getString(flagKey) === STORE_MIGRATION_VERSION) return;
  await clearMmkvStorageBackend(namespace);
  await clearAsyncStorageBackend(namespace).catch(() => undefined);
  storage.set(flagKey, STORE_MIGRATION_VERSION);
}
