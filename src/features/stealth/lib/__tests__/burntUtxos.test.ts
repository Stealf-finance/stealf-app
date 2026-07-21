/* eslint-disable import/first -- vi.mock must precede the import of the module under test */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSecure = vi.fn<(key: string) => Promise<string | null>>();
const setSecure = vi.fn<(key: string, value: string) => Promise<void>>();
const deleteSecure = vi.fn<(key: string) => Promise<void>>();

vi.mock('@/src/services/auth/secureStore', () => ({
  getSecure: (key: string) => getSecure(key),
  setSecure: (key: string, value: string) => setSecure(key, value),
  deleteSecure: (key: string) => deleteSecure(key),
}));

import {
  buildBurntUtxosKey,
  buildLegacyBurntUtxosKey,
  loadBurntUtxosForCurrentWallet,
  persistBurntUtxos,
  clearBurntUtxos,
  isBurnt,
} from '../burntUtxos';

// Base58 alphabet only — no 0, O, I or l — as a real Solana secret key would be.
const PRIVATE_KEY = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';

const HASHED_KEY = buildBurntUtxosKey(PRIVATE_KEY);
const LEGACY_KEY = buildLegacyBurntUtxosKey(PRIVATE_KEY);

beforeEach(() => {
  clearBurntUtxos();
  vi.clearAllMocks();
  getSecure.mockResolvedValue(null);
  setSecure.mockResolvedValue(undefined);
  deleteSecure.mockResolvedValue(undefined);
});

describe('burnt-UTXO Keychain key name', () => {
  it('embeds a hash, never the raw private key', () => {
    expect(HASHED_KEY).not.toContain(PRIVATE_KEY);
    expect(HASHED_KEY).toMatch(/^umbra_burnt_utxos_[0-9a-f]{16}$/);
  });

  it('is deterministic', () => {
    expect(buildBurntUtxosKey(PRIVATE_KEY)).toBe(
      buildBurntUtxosKey(PRIVATE_KEY),
    );
  });

  it('distinguishes different keys', () => {
    expect(buildBurntUtxosKey(PRIVATE_KEY)).not.toBe(
      buildBurntUtxosKey(`${PRIVATE_KEY}x`),
    );
  });

  // Regression pin: the old sanitiser was a no-op on base58 (its alphabet is a
  // subset of [A-Za-z0-9]), so the raw key landed in `kSecAttrAccount` — an
  // indexed, unencrypted Keychain column. This asserts the leak we migrated off.
  it('legacy builder reproduces the leaked name — the sanitiser did nothing', () => {
    expect(LEGACY_KEY).toBe(`umbra_burnt_utxos_${PRIVATE_KEY}`);
    expect(LEGACY_KEY).toContain(PRIVATE_KEY);
  });
});

describe('loadBurntUtxosForCurrentWallet', () => {
  it('reads the hashed key and never touches the legacy one when present', async () => {
    getSecure.mockImplementation(async (key) =>
      key === HASHED_KEY ? JSON.stringify(['1:2']) : null,
    );

    await loadBurntUtxosForCurrentWallet(PRIVATE_KEY);

    expect(getSecure).toHaveBeenCalledWith(HASHED_KEY);
    expect(getSecure).not.toHaveBeenCalledWith(LEGACY_KEY);
    expect(deleteSecure).not.toHaveBeenCalled();
    expect(isBurnt({ treeIndex: 1, insertionIndex: 2 })).toBe(true);
  });

  it('migrates a legacy entry to the hashed key and deletes the original', async () => {
    const payload = JSON.stringify(['7:8']);
    getSecure.mockImplementation(async (key) =>
      key === LEGACY_KEY ? payload : null,
    );

    await loadBurntUtxosForCurrentWallet(PRIVATE_KEY);

    expect(setSecure).toHaveBeenCalledWith(HASHED_KEY, payload);
    expect(deleteSecure).toHaveBeenCalledWith(LEGACY_KEY);
    expect(isBurnt({ treeIndex: 7, insertionIndex: 8 })).toBe(true);
  });

  it('still deletes the legacy entry when re-storing it fails', async () => {
    getSecure.mockImplementation(async (key) =>
      key === LEGACY_KEY ? JSON.stringify(['7:8']) : null,
    );
    setSecure.mockRejectedValue(new Error('keychain write failed'));

    await loadBurntUtxosForCurrentWallet(PRIVATE_KEY);

    // Scrubbing the exposed attribute matters more than preserving the cache.
    expect(deleteSecure).toHaveBeenCalledWith(LEGACY_KEY);
  });

  it('still deletes the legacy entry when reading it fails', async () => {
    getSecure.mockImplementation(async (key) => {
      if (key === LEGACY_KEY) throw new Error('keychain read failed');
      return null;
    });

    await loadBurntUtxosForCurrentWallet(PRIVATE_KEY);

    expect(deleteSecure).toHaveBeenCalledWith(LEGACY_KEY);
  });

  it('skips reloading when the same wallet is requested again', async () => {
    await loadBurntUtxosForCurrentWallet(PRIVATE_KEY);
    getSecure.mockClear();

    await loadBurntUtxosForCurrentWallet(PRIVATE_KEY);

    expect(getSecure).not.toHaveBeenCalled();
  });

  it('tolerates malformed stored JSON', async () => {
    getSecure.mockImplementation(async (key) =>
      key === HASHED_KEY ? 'not json' : null,
    );

    await expect(
      loadBurntUtxosForCurrentWallet(PRIVATE_KEY),
    ).resolves.toBeUndefined();
    expect(isBurnt({ treeIndex: 1, insertionIndex: 2 })).toBe(false);
  });
});

describe('persistBurntUtxos', () => {
  it('writes under the hashed key name', async () => {
    await loadBurntUtxosForCurrentWallet(PRIVATE_KEY);
    await persistBurntUtxos();

    expect(setSecure).toHaveBeenCalledWith(HASHED_KEY, expect.any(String));
    const [writtenKey] = setSecure.mock.calls[0];
    expect(writtenKey).not.toContain(PRIVATE_KEY);
  });

  it('is a no-op before any wallet is loaded', async () => {
    await persistBurntUtxos();
    expect(setSecure).not.toHaveBeenCalled();
  });
});
