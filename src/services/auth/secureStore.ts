import * as SecureStore from 'expo-secure-store';

export const SECURE_STORE_KEYS = {
  STEALF_PRIVATE_KEY: 'stealf_private_key',
  STEALF_MNEMONIC: 'stealf_mnemonic',
  STEALF_WALLET_ADDRESS: 'stealf_wallet_address',
  USER_DATA: 'user_data',
  SESSION_TOKEN: 'session_token',
  SUB_ORG_ID: 'sub_org_id',
  ONBOARDING_DRAFT: 'onboarding_draft',
} as const;

export type SecureStoreKey = typeof SECURE_STORE_KEYS[keyof typeof SECURE_STORE_KEYS];

// Keys whose loss is irreversible (can't re-issue from the server). Biometric-gated.
export const HIGH_SENSITIVITY_KEYS: readonly SecureStoreKey[] = [
  SECURE_STORE_KEYS.STEALF_PRIVATE_KEY,
  SECURE_STORE_KEYS.STEALF_MNEMONIC,
  SECURE_STORE_KEYS.SESSION_TOKEN,
];

const BASE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

const HIGH_OPTIONS: SecureStore.SecureStoreOptions = {
  ...BASE_OPTIONS,
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access your wallet',
};

export function resolveOptions(key: string): SecureStore.SecureStoreOptions {
  return (HIGH_SENSITIVITY_KEYS as readonly string[]).includes(key)
    ? HIGH_OPTIONS
    : BASE_OPTIONS;
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
