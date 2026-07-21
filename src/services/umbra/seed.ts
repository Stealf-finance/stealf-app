import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

const MASTER_SEED_KEY_PREFIX = 'umbra_master_seed_';

// Matches `secureStore.ts` BASE_OPTIONS. Existing seeds keep their previous
// ACL until the next write (SecureStore upgrades on set, not on read).
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

let currentWalletInput: string | null = null;

export function setActiveWallet(walletInput: string | null | undefined) {
  currentWalletInput = walletInput || null;
}

function safeKey(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function hashWalletForServiceKey(walletInput: string): string {
  return bytesToHex(sha256(utf8ToBytes(walletInput))).slice(0, 16);
}

export function buildHashedServiceKey(walletInput: string): string {
  return `${MASTER_SEED_KEY_PREFIX}${hashWalletForServiceKey(walletInput)}`;
}

export function buildLegacyServiceKey(walletInput: string): string {
  return `${MASTER_SEED_KEY_PREFIX}${safeKey(walletInput)}`;
}

function decodeSeed(stored: string): Uint8Array {
  return Uint8Array.from(Buffer.from(stored, 'base64'));
}

/**
 * A failed read is not an absent seed.
 *
 * `SecureStoreModule.swift` returns nil only for `errSecItemNotFound` and
 * throws `KeyChainException` for every other status, so absence and failure
 * arrive already distinguishable — swallowing the throw collapsed them.
 * Reporting `exists: false` makes the SDK treat the wallet as seedless and mint
 * a fresh master seed; `storeAtHashedKey` then overwrites the real one and
 * deletes the legacy copy, leaving every note encrypted under the original seed
 * permanently undecryptable. Entries are WHEN_PASSCODE_SET_THIS_DEVICE_ONLY, so
 * a read before first unlock genuinely throws. Read errors must propagate.
 */
async function loadWithMigration(walletInput: string) {
  const newKey = buildHashedServiceKey(walletInput);
  const stored = await SecureStore.getItemAsync(newKey, KEYCHAIN_OPTIONS);
  if (stored) return { exists: true as const, seed: decodeSeed(stored) };

  const legacyKey = buildLegacyServiceKey(walletInput);
  const legacyStored = await SecureStore.getItemAsync(
    legacyKey,
    KEYCHAIN_OPTIONS,
  );
  if (!legacyStored) return { exists: false as const };

  // Migration is best-effort and must never be destructive: we already hold a
  // valid seed, so if re-storing fails we keep the legacy entry and retry next
  // launch rather than deleting the only copy of it.
  try {
    await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(
      () => undefined,
    );
    await SecureStore.setItemAsync(newKey, legacyStored, KEYCHAIN_OPTIONS);
    await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(
      () => undefined,
    );
  } catch {
    // Legacy entry stays put; the seed returned below is still valid.
  }

  return { exists: true as const, seed: decodeSeed(legacyStored) };
}

async function storeAtHashedKey(walletInput: string, seed: Uint8Array) {
  const newKey = buildHashedServiceKey(walletInput);
  const encoded = Buffer.from(seed).toString('base64');
  await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(
    () => undefined,
  );
  await SecureStore.setItemAsync(newKey, encoded, KEYCHAIN_OPTIONS);
  // Best-effort: clear any legacy entry so it doesn't drift out of sync.
  const legacyKey = buildLegacyServiceKey(walletInput);
  await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(
    () => undefined,
  );
}

export const masterSeedStorage = {
  async load() {
    if (!currentWalletInput) return { exists: false as const };
    return loadWithMigration(currentWalletInput);
  },

  async store(seed: Uint8Array) {
    if (!currentWalletInput) {
      return { success: false as const, error: 'No active wallet' };
    }
    try {
      await storeAtHashedKey(currentWalletInput, seed);
      return { success: true as const };
    } catch (e) {
      return { success: false as const, error: String(e) };
    }
  },
};

export async function umbraClearSeed(): Promise<void> {
  if (!currentWalletInput) return;
  const newKey = buildHashedServiceKey(currentWalletInput);
  const legacyKey = buildLegacyServiceKey(currentWalletInput);
  await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(
    () => undefined,
  );
  await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(
    () => undefined,
  );
}

export function createMasterSeedStorage(walletInput: string) {
  return {
    async load() {
      return loadWithMigration(walletInput);
    },
    async store(seed: Uint8Array) {
      try {
        await storeAtHashedKey(walletInput, seed);
        return { success: true as const };
      } catch (e) {
        return { success: false as const, error: String(e) };
      }
    },
  };
}
