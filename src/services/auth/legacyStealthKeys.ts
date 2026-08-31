import { SECURE_STORE_KEYS, deleteSecure } from './secureStore';

/**
 * Keychain items left behind by the removed stealth wallet: a live ED25519
 * private key, its recovery phrase, and the address they belong to.
 *
 * They are deliberately NOT purged on logout. Any funds still sitting on the
 * old stealth address are reachable only through this phrase, and the app no
 * longer offers a re-import path — wiping on sign-out would strand them for
 * good. Account deletion is different: the user is leaving, so nothing of
 * theirs should survive on the device.
 */
export async function clearLegacyStealthKeys(): Promise<void> {
  await Promise.all([
    deleteSecure(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY).catch(() => undefined),
    deleteSecure(SECURE_STORE_KEYS.STEALF_MNEMONIC).catch(() => undefined),
    deleteSecure(SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS).catch(() => undefined),
  ]);
}
