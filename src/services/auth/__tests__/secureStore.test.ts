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
  it('returns biometric-gated options for high-sensitivity keys', () => {
    for (const key of HIGH_SENSITIVITY_KEYS) {
      const opts = resolveOptions(key);
      expect(opts.requireAuthentication).toBe(true);
      expect(opts.authenticationPrompt).toBeTruthy();
      expect(opts.keychainAccessible).toBeDefined();
    }
  });

  it('returns non-biometric options for routine keys', () => {
    const routine = [
      SECURE_STORE_KEYS.STEALF_WALLET_ADDRESS,
      SECURE_STORE_KEYS.USER_DATA,
    ];
    for (const key of routine) {
      const opts = resolveOptions(key);
      expect(opts.requireAuthentication).toBeFalsy();
      expect(opts.keychainAccessible).toBeDefined();
    }
  });

  it('classifies PK, mnemonic, and session token as high-sensitivity', () => {
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.STEALF_PRIVATE_KEY);
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.STEALF_MNEMONIC);
    expect(HIGH_SENSITIVITY_KEYS).toContain(SECURE_STORE_KEYS.SESSION_TOKEN);
  });
});
