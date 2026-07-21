/* eslint-disable import/first -- vi.mock must precede the import of the module under test */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const clearAllMmkvStorageBackend = vi.fn(async () => {});
const umbraClearSeed = vi.fn(async () => {});
const walletKeyCacheClearAll = vi.fn(async () => {});
const clearStealthState = vi.fn();
const socketDisconnect = vi.fn();
const purgeTurnkeyState = vi.fn(async () => {});
const removeClient = vi.fn(async () => {});

vi.mock('@/src/services/umbra/storage/mmkvStorageBackend', () => ({
  clearAllMmkvStorageBackend: () => clearAllMmkvStorageBackend(),
}));
vi.mock('@/src/services/umbra/seed', () => ({
  umbraClearSeed: () => umbraClearSeed(),
}));
vi.mock('@/src/services/cache/walletKeyCache', () => ({
  walletKeyCache: { clearAll: () => walletKeyCacheClearAll() },
}));
vi.mock('@/src/features/stealth/hooks/useUmbra', () => ({
  clearStealthState: () => clearStealthState(),
}));
vi.mock('@/src/services/real-time/socket', () => ({
  socketService: { disconnect: () => socketDisconnect() },
}));
vi.mock('@/src/features/onboarding/lib/passkeyHelpers', () => ({
  purgeTurnkeyState: () => purgeTurnkeyState(),
}));
vi.mock('@/src/services/queryClient', () => ({
  persister: { removeClient: () => removeClient() },
}));

import { performSessionTeardown } from '../lib/sessionTeardown';

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    turnkeyLogout: vi.fn(async () => {}),
    reset: vi.fn(),
    queryClient: { clear: vi.fn() } as never,
    capture: vi.fn(),
    resetAnalytics: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('performSessionTeardown', () => {
  // Regression pin: the MMKV wipe once lived in useLogout's own body, so the
  // session_expired path tore the session down and left the decrypted UTXO
  // store on disk — the case where the user did NOT choose to sign out.
  it.each(['user_signed_out', 'session_expired'] as const)(
    'wipes the decrypted note store on the %s path',
    async (reason) => {
      await performSessionTeardown(reason, makeDeps());

      expect(clearAllMmkvStorageBackend).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['user_signed_out', 'session_expired'] as const)(
    'removes the persisted query cache on the %s path',
    async (reason) => {
      await performSessionTeardown(reason, makeDeps());

      expect(removeClient).toHaveBeenCalledTimes(1);
    },
  );

  it('clears every store that holds wallet material', async () => {
    await performSessionTeardown('user_signed_out', makeDeps());

    expect(umbraClearSeed).toHaveBeenCalled();
    expect(clearAllMmkvStorageBackend).toHaveBeenCalled();
    expect(walletKeyCacheClearAll).toHaveBeenCalled();
    expect(purgeTurnkeyState).toHaveBeenCalled();
    expect(clearStealthState).toHaveBeenCalled();
  });

  it('reports the reason to analytics', async () => {
    const deps = makeDeps();

    await performSessionTeardown('session_expired', deps);
    expect(deps.capture).toHaveBeenCalledWith('auth_session_expired');

    await performSessionTeardown(
      'user_signed_out',
      makeDeps({ capture: deps.capture }),
    );
    expect(deps.capture).toHaveBeenCalledWith('auth_signed_out');
  });

  // A 401 storm fires one teardown per failed response; without the guard they
  // race each other into concurrent SecureStore deletes.
  it('collapses concurrent teardowns into one run', async () => {
    const deps = makeDeps();

    await Promise.all([
      performSessionTeardown('session_expired', deps),
      performSessionTeardown('session_expired', deps),
      performSessionTeardown('session_expired', deps),
    ]);

    expect(clearAllMmkvStorageBackend).toHaveBeenCalledTimes(1);
    expect(deps.reset).toHaveBeenCalledTimes(1);
  });

  it('runs again after an earlier teardown settled', async () => {
    await performSessionTeardown('user_signed_out', makeDeps());
    await performSessionTeardown('user_signed_out', makeDeps());

    expect(clearAllMmkvStorageBackend).toHaveBeenCalledTimes(2);
  });

  // Turnkey throws on the session_expired path — it has already dropped its
  // own session — so it must never block the rest of the teardown.
  it('completes the teardown even when turnkeyLogout throws', async () => {
    const deps = makeDeps({
      turnkeyLogout: vi.fn(async () => {
        throw new Error('session already gone');
      }),
    });

    await performSessionTeardown('session_expired', deps);

    expect(clearAllMmkvStorageBackend).toHaveBeenCalled();
    expect(purgeTurnkeyState).toHaveBeenCalled();
    expect(deps.reset).toHaveBeenCalled();
  });
});
