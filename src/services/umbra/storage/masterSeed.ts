import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

const KEY_PREFIX = 'umbra_master_seed_';

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

function keychainKey(walletInput: string): string {
  const digest = bytesToHex(sha256(utf8ToBytes(walletInput))).slice(0, 16);
  return `${KEY_PREFIX}${digest}`;
}

export function createMasterSeedStorage(walletInput: string) {
  const key = keychainKey(walletInput);

  return {
    async load(): Promise<
      { exists: true; seed: Uint8Array } | { exists: false }
    > {
      const stored = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
      if (!stored) return { exists: false };
      return {
        exists: true,
        seed: Uint8Array.from(Buffer.from(stored, 'base64')),
      };
    },

    async store(
      seed: Uint8Array,
    ): Promise<{ success: true } | { success: false; error: string }> {
      try {
        await SecureStore.setItemAsync(
          key,
          Buffer.from(seed).toString('base64'),
          KEYCHAIN_OPTIONS,
        );
        return { success: true };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
  };
}

export async function clearMasterSeed(walletInput: string): Promise<void> {
  await SecureStore.deleteItemAsync(keychainKey(walletInput), KEYCHAIN_OPTIONS)
    .catch(() => undefined);
}
