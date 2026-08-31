import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

const KEY_PREFIX = 'umbra_master_seed_';

// Matches `secureStore.ts` BASE_OPTIONS. Existing seeds keep their previous
// ACL until the next write (SecureStore upgrades on set, not on read).
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

function safeKey(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function hashWalletForServiceKey(walletInput: string): string {
  return bytesToHex(sha256(utf8ToBytes(walletInput))).slice(0, 16);
}

export function buildHashedServiceKey(walletInput: string): string {
  return `${KEY_PREFIX}${hashWalletForServiceKey(walletInput)}`;
}

/**
 * The pre-migration identifier: the raw wallet address, sanitised. Seeds
 * written before the hashed scheme still live under it on existing installs.
 */
export function buildLegacyServiceKey(walletInput: string): string {
  return `${KEY_PREFIX}${safeKey(walletInput)}`;
}

function decodeSeed(stored: string): Uint8Array {
  return Uint8Array.from(Buffer.from(stored, 'base64'));
}

/**
 * A failed read is not an absent seed.
 *
 * `SecureStoreModule.swift` returns nil only for `errSecItemNotFound` and
 * throws `KeyChainException` for every other status, so absence and failure
 * arrive already distinguishable — swallowing the throw collapses them.
 * Reporting `exists: false` makes the SDK treat the wallet as seedless and mint
 * a fresh master seed; the next store then overwrites the real one, leaving
 * every note encrypted under the original seed permanently undecryptable.
 * Entries are WHEN_PASSCODE_SET_THIS_DEVICE_ONLY, so a read before first unlock
 * genuinely throws. Read errors must propagate.
 *
 * The legacy fallback is load-bearing for the same reason: dropping it makes an
 * un-migrated wallet look seedless, with the identical outcome.
 */
async function loadWithMigration(
  walletInput: string,
): Promise<{ exists: true; seed: Uint8Array } | { exists: false }> {
  const newKey = buildHashedServiceKey(walletInput);
  const stored = await SecureStore.getItemAsync(newKey, KEYCHAIN_OPTIONS);
  if (stored) return { exists: true, seed: decodeSeed(stored) };

  const legacyKey = buildLegacyServiceKey(walletInput);
  const legacyStored = await SecureStore.getItemAsync(
    legacyKey,
    KEYCHAIN_OPTIONS,
  );
  if (!legacyStored) return { exists: false };

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

  return { exists: true, seed: decodeSeed(legacyStored) };
}

async function storeAtHashedKey(
  walletInput: string,
  seed: Uint8Array,
): Promise<void> {
  const newKey = buildHashedServiceKey(walletInput);
  const encoded = Buffer.from(seed).toString('base64');
  await SecureStore.deleteItemAsync(newKey, KEYCHAIN_OPTIONS).catch(
    () => undefined,
  );
  await SecureStore.setItemAsync(newKey, encoded, KEYCHAIN_OPTIONS);
  // Best-effort: clear any legacy entry so it doesn't drift out of sync.
  await SecureStore.deleteItemAsync(
    buildLegacyServiceKey(walletInput),
    KEYCHAIN_OPTIONS,
  ).catch(() => undefined);
}

export function createMasterSeedStorage(walletInput: string) {
  return {
    async load(): Promise<
      { exists: true; seed: Uint8Array } | { exists: false }
    > {
      return loadWithMigration(walletInput);
    },

    async store(
      seed: Uint8Array,
    ): Promise<{ success: true } | { success: false; error: string }> {
      try {
        await storeAtHashedKey(walletInput, seed);
        return { success: true };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
  };
}

export async function clearMasterSeed(walletInput: string): Promise<void> {
  await SecureStore.deleteItemAsync(
    buildHashedServiceKey(walletInput),
    KEYCHAIN_OPTIONS,
  ).catch(() => undefined);
  // Wipe the legacy entry too, or a logout would leave the real seed behind.
  await SecureStore.deleteItemAsync(
    buildLegacyServiceKey(walletInput),
    KEYCHAIN_OPTIONS,
  ).catch(() => undefined);
}
