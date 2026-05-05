import { SECURE_STORE_KEYS, getSecure, setSecure, deleteSecure } from '../auth/secureStore';

const TTL_MS = 15 * 60 * 1000;

let cachedPrivateKey: string | null = null;
let cachedMnemonic: string | null = null;
let expiresAt = 0;
let inFlightKeyRead: Promise<string | null> | null = null;

function isExpired(): boolean {
  return Date.now() >= expiresAt;
}

function refreshTTL(): void {
  expiresAt = Date.now() + TTL_MS;
}

export const walletKeyCache = {
  /** Persist signing key to Keychain + RAM. Mnemonic stays in RAM only. */
  async store(privateKey: string, mnemonic?: string): Promise<void> {
    cachedPrivateKey = privateKey;
    if (mnemonic) cachedMnemonic = mnemonic;
    refreshTTL();

    await setSecure(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY, privateKey);
    if (mnemonic) await setSecure(SECURE_STORE_KEYS.STEALF_MNEMONIC, mnemonic);
  },

  /** RAM (if not expired) → Keychain fallback. */
  async getPrivateKey(): Promise<string | null> {
    if (cachedPrivateKey && !isExpired()) return cachedPrivateKey;
    if (inFlightKeyRead) return inFlightKeyRead;

    inFlightKeyRead = (async () => {
      try {
        const val = await getSecure(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY);
        if (val) {
          cachedPrivateKey = val;
          refreshTTL();
          return val;
        }
      } catch {
        // ignore — return null
      }
      return null;
    })();

    try {
      return await inFlightKeyRead;
    } finally {
      inFlightKeyRead = null;
    }
  },

  /** RAM only (never re-read from Keychain). Respects TTL. */
  getMnemonic(): string | null {
    if (cachedMnemonic && !isExpired()) return cachedMnemonic;
    return null;
  },

  /** Read from Keychain if not in RAM. Used by recovery flows. */
  async getMnemonicPersisted(): Promise<string | null> {
    if (cachedMnemonic) return cachedMnemonic;
    try {
      const val = await getSecure(SECURE_STORE_KEYS.STEALF_MNEMONIC);
      if (val) cachedMnemonic = val;
      return val;
    } catch {
      return null;
    }
  },

  touch(): void {
    if (cachedPrivateKey) refreshTTL();
  },

  /** Pre-load from Keychain into RAM. Call after sign-in. */
  async warmup(): Promise<void> {
    if (cachedPrivateKey) return;
    try {
      const key = await getSecure(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY);
      if (key) {
        cachedPrivateKey = key;
        refreshTTL();
      }
    } catch {
      // ignore
    }
  },

  async clearAll(): Promise<void> {
    cachedPrivateKey = null;
    cachedMnemonic = null;
    expiresAt = 0;
    inFlightKeyRead = null;
    await Promise.all([
      deleteSecure(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY).catch(() => undefined),
      deleteSecure(SECURE_STORE_KEYS.STEALF_MNEMONIC).catch(() => undefined),
      deleteSecure(SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS).catch(() => undefined),
    ]);
  },

  /** Wipe RAM only (e.g. session expiry). */
  clear(): void {
    cachedPrivateKey = null;
    cachedMnemonic = null;
    expiresAt = 0;
    inFlightKeyRead = null;
  },

  hasKeys(): boolean {
    return !!(cachedPrivateKey && !isExpired());
  },
};
