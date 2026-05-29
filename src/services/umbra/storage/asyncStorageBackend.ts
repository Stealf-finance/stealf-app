import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import type { StorageBackend } from '@umbra-privacy/sdk/store-adapters';

// AsyncStorage stores strings only — Umbra's sharded store hands us
// pre-encrypted Uint8Array blobs, so we base64-wrap them at the boundary.
// Keys are pre-derived by the SDK (hex/opaque), already AsyncStorage-safe.

/**
 * Build a `StorageBackend` over the device's AsyncStorage.
 *
 * `namespace` lets us scope the keys (e.g. per stealth wallet address) so
 * switching wallets in the same install doesn't leak shards between sessions.
 * The SDK already derives its keys from the master seed, but the namespace
 * prefix gives us a cheap "wipe per wallet" operation without touching the
 * encrypted blobs themselves.
 */
export function createAsyncStorageBackend(namespace: string): StorageBackend {
  const prefix = `umbra-store.${namespace}.`;

  return {
    async read(key: string): Promise<Uint8Array | null> {
      const raw = await AsyncStorage.getItem(prefix + key);
      if (raw === null) return null;
      return new Uint8Array(Buffer.from(raw, 'base64'));
    },
    async write(key: string, data: Uint8Array): Promise<void> {
      await AsyncStorage.setItem(prefix + key, Buffer.from(data).toString('base64'));
    },
    async delete(key: string): Promise<void> {
      await AsyncStorage.removeItem(prefix + key);
    },
  };
}

/** Wipe every blob under this wallet's namespace. */
export async function clearAsyncStorageBackend(namespace: string): Promise<void> {
  const prefix = `umbra-store.${namespace}.`;
  const allKeys = await AsyncStorage.getAllKeys();
  const ours = allKeys.filter((k) => k.startsWith(prefix));
  if (ours.length > 0) await AsyncStorage.multiRemove(ours);
}

/**
 * Cheap "does the sharded Umbra store have ANY blob for this wallet?" probe.
 * Used to short-circuit eager-scan flows on launch without paying the full
 * client-build + indexer-roundtrip cost.
 */
export async function hasAsyncStorageBackendData(
  namespace: string,
): Promise<boolean> {
  const prefix = `umbra-store.${namespace}.`;
  const allKeys = await AsyncStorage.getAllKeys();
  return allKeys.some((k) => k.startsWith(prefix));
}
