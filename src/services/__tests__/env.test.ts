import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_ENV = {
  EXPO_PUBLIC_ORGANIZATION_ID: 'org_test',
  EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID: 'cfg_test',
  EXPO_PUBLIC_API_URL: 'https://api.example.test',
  EXPO_PUBLIC_SOLANA_RPC_URL: 'https://rpc.example.test',
  EXPO_PUBLIC_SOLANA_WSS_URL: 'wss://rpc.example.test',
} as const;

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries(VALID_ENV)) {
    vi.stubEnv(key, value);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validateEnv', () => {
  it('returns parsed env when all required vars are set', async () => {
    const { validateEnv } = await import('../env');
    const env = validateEnv();
    expect(env.EXPO_PUBLIC_API_URL).toBe(VALID_ENV.EXPO_PUBLIC_API_URL);
    expect(env.EXPO_PUBLIC_ORGANIZATION_ID).toBe(VALID_ENV.EXPO_PUBLIC_ORGANIZATION_ID);
  });

  it('throws when a required var is missing', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    const { validateEnv } = await import('../env');
    expect(() => validateEnv()).toThrow(/Invalid environment configuration/);
  });

  it('throws when a URL var is malformed', async () => {
    vi.stubEnv('EXPO_PUBLIC_SOLANA_RPC_URL', 'not-a-url');
    const { validateEnv } = await import('../env');
    expect(() => validateEnv()).toThrow(/Invalid environment configuration/);
  });

  it('accepts optional telemetry vars when omitted', async () => {
    const { validateEnv } = await import('../env');
    const env = validateEnv();
    expect(env.EXPO_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(env.EXPO_PUBLIC_POSTHOG_API_KEY).toBeUndefined();
  });
});
