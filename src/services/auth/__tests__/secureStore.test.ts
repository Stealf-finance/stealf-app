/* eslint-disable import/first -- vi.mock must precede the import of the module under test */
import { describe, it, expect, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly',
  AFTER_FIRST_UNLOCK: 'kSecAttrAccessibleAfterFirstUnlock',
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

import { resolveOptions, HIGH_SENSITIVITY_KEYS, SECURE_STORE_KEYS } from '../secureStore';

describe('secureStore options', () => {
  // Biometric ACL on HIGH_SENSITIVITY_KEYS is currently OFF (devnet decision).
  // resolveOptions returns BASE_OPTIONS for every key — biometric prompt
  // restoration is deferred until the mainnet ramp. The test below pins
  // the current contract; flip both sides when biometric is re-enabled.
  it('returns BASE_OPTIONS for every key (biometric gating deferred)', () => {
    const everyKey = [...HIGH_SENSITIVITY_KEYS, SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS, SECURE_STORE_KEYS.USER_DATA];
    for (const key of everyKey) {
      const opts = resolveOptions(key);
      expect(opts.requireAuthentication).toBeFalsy();
      expect(opts.keychainAccessible).toBeDefined();
    }
  });

  it('classifies PK, mnemonic, and session token as the keys to gate first when biometric is restored', () => {
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY);
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.STEALF_MNEMONIC);
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.SESSION_TOKEN);
  });
});
