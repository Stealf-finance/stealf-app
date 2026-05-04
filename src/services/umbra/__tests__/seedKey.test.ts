/* eslint-disable import/first -- vi.mock must precede the import of the module under test */
import { describe, it, expect, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'kSecAttrAccessibleAfterFirstUnlock',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly',
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

import {
  hashWalletForServiceKey,
  buildLegacyServiceKey,
  buildHashedServiceKey,
} from '../seed';

describe('Umbra seed Keychain key', () => {
  it('hashWalletForServiceKey returns a 16-char hex string', () => {
    const hash = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('hashWalletForServiceKey is deterministic', () => {
    const a = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    const b = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    expect(a).toBe(b);
  });

  it('different inputs produce different hashes', () => {
    const a = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qV');
    const b = hashWalletForServiceKey('5JUYrwoLXjzpqwkLMmWuP3qW');
    expect(a).not.toBe(b);
  });

  it('buildHashedServiceKey embeds the hash, not the raw input', () => {
    const raw = '5JUYrwoLXjzpqwkLMmWuP3qV';
    const key = buildHashedServiceKey(raw);
    expect(key).not.toContain(raw);
    expect(key).toMatch(/^umbra_master_seed_[0-9a-f]{16}$/);
  });

  it('buildLegacyServiceKey reproduces the pre-migration identifier (sanitised raw input)', () => {
    const raw = '5JUYrwoL/XjzpqwkLMmWuP3qV';
    const legacy = buildLegacyServiceKey(raw);
    expect(legacy).toBe('umbra_master_seed_5JUYrwoL_XjzpqwkLMmWuP3qV');
  });
});
