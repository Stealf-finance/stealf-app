import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchUserProfile } from '../api/userProfile';
import { validateEnv } from '@/src/services/env';

const SAMPLE_BANK_WALLET = '8R9XzcLLp7XK1xKKZxfKYAKpCTGhxq4yfPHo7nNh1NZh';
const ENV_BACKUP = { ...process.env };

function mockFetchOk(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => payload,
    })) as unknown as typeof fetch,
  );
}

function mockFetchErr(status: number, body: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      status,
      json: async () => body,
    })) as unknown as typeof fetch,
  );
}

describe('fetchUserProfile', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test.local';
    process.env.EXPO_PUBLIC_ORGANIZATION_ID = 'test-org';
    process.env.EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID = 'test-proxy';
    process.env.EXPO_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com';
    process.env.EXPO_PUBLIC_SOLANA_WSS_URL = 'wss://api.devnet.solana.com';
    validateEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    process.env = { ...ENV_BACKUP };
  });

  it('parses a backend response into a normalised User', async () => {
    mockFetchOk({
      data: {
        user: {
          username: 'thomas',
          bank_wallet: SAMPLE_BANK_WALLET,
          stealf_wallet: null,
          subOrgId: 'sub-123',
          points: 42,
        },
      },
    });

    const user = await fetchUserProfile('session-token', SAMPLE_BANK_WALLET);

    expect(user.username).toBe('thomas');
    expect(user.bankWallet).toBe(SAMPLE_BANK_WALLET);
    expect(user.stealfWallet).toBeNull();
    expect(user.subOrgId).toBe('sub-123');
    expect(user.points).toBe(42);
  });

  it('falls back to pseudo when username is missing', async () => {
    mockFetchOk({
      data: {
        user: {
          pseudo: 'thomas-pseudo',
          bank_wallet: SAMPLE_BANK_WALLET,
          subOrgId: 'sub-123',
        },
      },
    });

    const user = await fetchUserProfile('session-token', SAMPLE_BANK_WALLET);
    expect(user.username).toBe('thomas-pseudo');
    expect(user.points).toBe(0);
  });

  it('throws ApiError on non-2xx', async () => {
    mockFetchErr(401, { error: 'unauthorized' });
    await expect(
      fetchUserProfile('bad-token', SAMPLE_BANK_WALLET),
    ).rejects.toThrow(/unauthorized/i);
  });

  it('throws ZodError when bank wallet is malformed', async () => {
    mockFetchOk({
      data: {
        user: {
          username: 'thomas',
          bank_wallet: 'not-a-real-address',
          subOrgId: 'sub-123',
        },
      },
    });

    await expect(
      fetchUserProfile('session-token', SAMPLE_BANK_WALLET),
    ).rejects.toThrow();
  });
});
