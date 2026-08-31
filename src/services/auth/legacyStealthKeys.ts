import { SECURE_STORE_KEYS, deleteSecure } from './secureStore';

/**
 * Keychain items left behind by the removed stealth wallet: an ED25519 private
 * key, its recovery phrase, and the address they belong to.
 *
 * The wallet only ever existed on devnet, so there is nothing to preserve —
 * these are wiped wherever wallet material is wiped (sign-out, session expiry,
 * account deletion) and once at boot, so installs that never sign out again
 * still get cleaned.
 */
export async function clearLegacyStealthKeys(): Promise<void> {
  await Promise.all([
    deleteSecure(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY).catch(() => undefined),
    deleteSecure(SECURE_STORE_KEYS.STEALF_MNEMONIC).catch(() => undefined),
    deleteSecure(SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS).catch(
      () => undefined,
    ),
  ]);
}

let purged = false;

/**
 * Boot-time purge, once per app launch. Deleting an absent Keychain item is a
 * no-op, so this stays cheap on every launch after the first.
 */
export function purgeLegacyStealthKeysOnce(): void {
  if (purged) return;
  purged = true;
  void clearLegacyStealthKeys();
}
