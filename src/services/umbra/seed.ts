import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

const MASTER_SEED_KEY_PREFIX = 'umbra_master_seed_';


const LEGACY_FALLBACK_REMOVE_AFTER = '2026-05-11';

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

async function loadWithMigration(walletInput: string) {
  const newKey = buildHashedServiceKey(walletInput);
  try {
    const stored = await SecureStore.getItemAsync(newKey, KEYCHAIN_OPTIONS);
    if (stored) {
      const seed = Uint8Array.from(Buffer.from(stored, 'base64'));
      return { exists: true as const, seed };
    }
  } catch {
    // fall through to legacy lookup
  }

  // Legacy fallback — kept until LEGACY_FALLBACK_REMOVE_AFTER.
  const legacyKey = buildLegacyServiceKey(walletInput);
  try {
    const legacyStored = await SecureStore.getItemAsync(legacyKey, KEYCHAIN_OPTIONS);
    if (!legacyStored) return { exists: false as const };

    // Migrate: re-store under the hashed key, then delete the legacy entry.
    await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(() => undefined);
    await SecureStore.setItemAsync(newKey, legacyStored, KEYCHAIN_OPTIONS);
    await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(() => undefined);

    const seed = Uint8Array.from(Buffer.from(legacyStored, 'base64'));
    return { exists: true as const, seed };
  } catch {
    return { exists: false as const };
  }
}

async function storeAtHashedKey(walletInput: string, seed: Uint8Array) {
  const newKey = buildHashedServiceKey(walletInput);
  const encoded = Buffer.from(seed).toString('base64');
  await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(() => undefined);
  await SecureStore.setItemAsync(newKey, encoded, KEYCHAIN_OPTIONS);
  // Best-effort: clear any legacy entry so it doesn't drift out of sync.
  const legacyKey = buildLegacyServiceKey(walletInput);
  await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(() => undefined);
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
  await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(() => undefined);
  await SecureStore.deleteItemAsync(legacyKey, KEYCHAIN_OPTIONS).catch(() => undefined);
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

export const __TEST_ONLY__ = { LEGACY_FALLBACK_REMOVE_AFTER };
