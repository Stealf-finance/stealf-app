import * as SecureStore from 'expo-secure-store';

const MASTER_SEED_KEY_PREFIX = 'umbra_master_seed_';
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let currentWalletKey: string | null = null;

export function setActiveWallet(walletAddress: string | null | undefined) {
  currentWalletKey = walletAddress || null;
}

function safeKey(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

function getStorageKey(): string | null {
  if (!currentWalletKey) return null;
  return `${MASTER_SEED_KEY_PREFIX}${safeKey(currentWalletKey)}`;
}

export const masterSeedStorage = {
  async load() {
    const key = getStorageKey();
    if (!key) return { exists: false as const };
    try {
      const stored = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
      if (!stored) return { exists: false as const };
      const seed = Uint8Array.from(Buffer.from(stored, 'base64'));
      return { exists: true as const, seed };
    } catch {
      return { exists: false as const };
    }
  },

  async store(seed: Uint8Array) {
    const key = getStorageKey();
    if (!key) return { success: false as const, error: 'No active wallet' };
    try {
      const encoded = Buffer.from(seed).toString('base64');
      await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS).catch(() => undefined);
      await SecureStore.setItemAsync(key, encoded, KEYCHAIN_OPTIONS);
      return { success: true as const };
    } catch (e) {
      return { success: false as const, error: String(e) };
    }
  },
};

/**
 * Clear the master seed for the currently active wallet only. Other wallets'
 * seeds are preserved so they remain decryptable after a wallet switch.
 */
export async function umbraClearSeed(): Promise<void> {
  const key = getStorageKey();
  if (!key) return;
  await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS).catch(() => undefined);
}

/**
 * Build a master seed storage scoped to a specific wallet address (e.g. the
 * bank wallet) without touching the global `currentWalletKey`. Used by the
 * bank-wallet UmbraClient so its seed reads/writes never collide with the
 * stealth wallet storage.
 */
export function createMasterSeedStorage(walletAddress: string) {
  const key = `${MASTER_SEED_KEY_PREFIX}${safeKey(walletAddress)}`;
  return {
    async load() {
      try {
        const stored = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
        if (!stored) return { exists: false as const };
        const seed = Uint8Array.from(Buffer.from(stored, 'base64'));
        return { exists: true as const, seed };
      } catch {
        return { exists: false as const };
      }
    },
    async store(seed: Uint8Array) {
      try {
        const encoded = Buffer.from(seed).toString('base64');
        await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS).catch(() => undefined);
        await SecureStore.setItemAsync(key, encoded, KEYCHAIN_OPTIONS);
        return { success: true as const };
      } catch (e) {
        return { success: false as const, error: String(e) };
      }
    },
  };
}
