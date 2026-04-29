import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { validateEnv } from '@/src/services/env';
import {
  OnboardingError,
  submitInviteCode,
  submitVerifyCode,
} from '../api/onboarding';

beforeAll(() => {
  process.env.EXPO_PUBLIC_ORGANIZATION_ID ??= 'org_test';
  process.env.EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID ??= 'cfg_test';
  process.env.EXPO_PUBLIC_API_URL ??= 'https://api.test.invalid';
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ??= 'https://rpc.test.invalid';
  process.env.EXPO_PUBLIC_SOLANA_WSS_URL ??= 'wss://wss.test.invalid';
  validateEnv();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(response: Partial<Response>) {
  const fetchMock = vi.fn(async () => response as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('submitInviteCode', () => {
  it('parses the sessionId from data envelope', async () => {
    mockFetch({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: { sessionId: 'sid_abc' } }),
    });
    const out = await submitInviteCode({ inviteCode: 'STEALF' });
    expect(out.sessionId).toBe('sid_abc');
  });

  it('throws OnboardingError("INVALID_INVITE") on a 4xx with structured body', async () => {
    mockFetch({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({ code: 'INVALID_INVITE', message: 'nope' }),
    });
    await expect(
      submitInviteCode({ inviteCode: 'WRONG' }),
    ).rejects.toBeInstanceOf(OnboardingError);
  });
});

describe('submitVerifyCode', () => {
  it('captures Retry-After on TOO_MANY_ATTEMPTS', async () => {
    mockFetch({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '45' }),
      json: async () => ({ code: 'TOO_MANY_ATTEMPTS' }),
    });
    try {
      await submitVerifyCode({ sessionId: 'sid_x', code: '111111' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OnboardingError);
      expect((err as OnboardingError).code).toBe('TOO_MANY_ATTEMPTS');
      expect((err as OnboardingError).retryAfterSeconds).toBe(45);
    }
  });

  it('parses the verified=true success body', async () => {
    mockFetch({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: { verified: true } }),
    });
    const out = await submitVerifyCode({ sessionId: 'sid_x', code: '123456' });
    expect(out.verified).toBe(true);
  });

  it('falls through unknown error codes to ApiError-style failure', async () => {
    mockFetch({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({}),
    });
    await expect(
      submitVerifyCode({ sessionId: 'sid_x', code: '111111' }),
    ).rejects.not.toBeInstanceOf(OnboardingError);
  });
});
