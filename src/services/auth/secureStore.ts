import * as SecureStore from 'expo-secure-store';

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const SECURE_STORE_KEYS = {
  STEALF_PRIVATE_KEY: 'stealf_private_key',
  STEALF_MNEMONIC: 'stealf_mnemonic',
  USER_DATA: 'user_data',
  SUB_ORG_ID: 'sub_org_id',
} as const;

export async function setSecure(key: string, value: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS).catch(() => undefined);
  await SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS);
}

export function getSecure(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
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
