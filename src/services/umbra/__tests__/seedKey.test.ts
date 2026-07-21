/* eslint-disable import/first -- vi.mock must precede the import of the module under test */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'kSecAttrAccessibleAfterFirstUnlock',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY:
    'kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly',
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import {
  hashWalletForServiceKey,
  buildLegacyServiceKey,
  buildHashedServiceKey,
  createMasterSeedStorage,
} from '../seed';

const getItemAsync = vi.mocked(SecureStore.getItemAsync);
const setItemAsync = vi.mocked(SecureStore.setItemAsync);
const deleteItemAsync = vi.mocked(SecureStore.deleteItemAsync);

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

describe('master seed load — a failed read must never look like absence', () => {
  const WALLET = '5JUYrwoLXjzpqwkLMmWuP3qV';
  const HASHED = buildHashedServiceKey(WALLET);
  const LEGACY = buildLegacyServiceKey(WALLET);
  const SEED_BYTES = Uint8Array.from([1, 2, 3, 4]);
  const SEED_B64 = Buffer.from(SEED_BYTES).toString('base64');

  beforeEach(() => {
    vi.clearAllMocks();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue(undefined);
    deleteItemAsync.mockResolvedValue(undefined);
  });

  it('reports absence only when both reads genuinely return null', async () => {
    await expect(createMasterSeedStorage(WALLET).load()).resolves.toEqual({
      exists: false,
    });
  });

  it('returns the seed from the hashed key without touching the legacy one', async () => {
    getItemAsync.mockImplementation(async (key) =>
      key === HASHED ? SEED_B64 : null,
    );

    const res = await createMasterSeedStorage(WALLET).load();

    expect(res).toEqual({ exists: true, seed: SEED_BYTES });
    expect(getItemAsync).not.toHaveBeenCalledWith(LEGACY, expect.anything());
  });

  // Regression pin: swallowing this throw returned { exists: false }, so the
  // SDK minted a fresh master seed and storeAtHashedKey then overwrote the real
  // one — orphaning every note encrypted under it. Failure must be loud.
  it('propagates a hashed-key read failure instead of reporting absence', async () => {
    getItemAsync.mockImplementation(async (key) => {
      if (key === HASHED) throw new Error('KeyChainException(-25308)');
      return null;
    });

    await expect(createMasterSeedStorage(WALLET).load()).rejects.toThrow(
      /KeyChainException/,
    );
  });

  it('propagates a legacy read failure instead of reporting absence', async () => {
    getItemAsync.mockImplementation(async (key) => {
      if (key === LEGACY) throw new Error('KeyChainException(-25308)');
      return null;
    });

    await expect(createMasterSeedStorage(WALLET).load()).rejects.toThrow(
      /KeyChainException/,
    );
  });

  it('migrates a legacy seed to the hashed key and removes the legacy entry', async () => {
    getItemAsync.mockImplementation(async (key) =>
      key === LEGACY ? SEED_B64 : null,
    );

    const res = await createMasterSeedStorage(WALLET).load();

    expect(res).toEqual({ exists: true, seed: SEED_BYTES });
    expect(setItemAsync).toHaveBeenCalledWith(
      HASHED,
      SEED_B64,
      expect.anything(),
    );
    expect(deleteItemAsync).toHaveBeenCalledWith(LEGACY, expect.anything());
  });

  it('keeps the legacy entry and still returns the seed when the migration write fails', async () => {
    getItemAsync.mockImplementation(async (key) =>
      key === LEGACY ? SEED_B64 : null,
    );
    setItemAsync.mockRejectedValue(new Error('keychain write failed'));

    const res = await createMasterSeedStorage(WALLET).load();

    expect(res).toEqual({ exists: true, seed: SEED_BYTES });
    // The only surviving copy must never be deleted.
    expect(deleteItemAsync).not.toHaveBeenCalledWith(LEGACY, expect.anything());
  });
});
