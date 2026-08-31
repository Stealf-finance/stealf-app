import * as SecureStore from 'expo-secure-store';

export const SECURE_STORE_KEYS = {
  // Legacy, delete-only — the stealth wallet these belong to is gone and
  // nothing writes them any more. Kept so `legacyStealthKeys.ts` can address
  // them for deletion.
  STEALF_PRIVATE_KEY: 'stealf_private_key',
  STEALF_MNEMONIC: 'stealf_mnemonic',
  STEALF_WALLET_ADDRESS: 'stealf_wallet_address',
  USER_DATA: 'user_data',
  SESSION_TOKEN: 'session_token',
} as const;

export type SecureStoreKey = typeof SECURE_STORE_KEYS[keyof typeof SECURE_STORE_KEYS];

/**
 * Keys to gate first if biometric auth is ever restored. The stealth wallet's
 * key and mnemonic used to head this list; with that wallet gone, the session
 * token is the only *static* key left worth gating. The genuinely sensitive
 * material now lives under runtime-built names this list can't hold:
 * `umbra_master_seed_<hash>` (viewing key) and `umbra_store_encryption_key`
 * (unlocks the decrypted UTXO store).
 */
export const HIGH_SENSITIVITY_KEYS: readonly SecureStoreKey[] = [
  SECURE_STORE_KEYS.SESSION_TOKEN,
];

const BASE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

export function resolveOptions(_key: string): SecureStore.SecureStoreOptions {
  return BASE_OPTIONS;
}

export async function setSecure(key: string, value: string): Promise<void> {
  const opts = resolveOptions(key);
  await SecureStore.deleteItemAsync(key, opts).catch(() => undefined);
  await SecureStore.setItemAsync(key, value, opts);
}

export function getSecure(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, resolveOptions(key));
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, resolveOptions(key));
}

export async function setSecureJson<T>(key: string, value: T): Promise<void> {
  await setSecure(key, JSON.stringify(value));
}

export async function getSecureJson<T>(key: string): Promise<T | null> {
  const raw = await getSecure(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
