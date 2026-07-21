import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/services/env', () => ({
  getEnv: () => ({ EXPO_PUBLIC_API_URL: 'https://api.test' }),
}));

// eslint-disable-next-line import/first -- vi.mock above must hoist before this
import { apiGet, apiPost } from '@/src/services/api/client';
// eslint-disable-next-line import/first
import { ApiError } from '@/src/services/api/errors';
// eslint-disable-next-line import/first
import { subscribeSessionExpired } from '@/src/services/auth/sessionEvents';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('api client — session expiry signalling', () => {
  let unsubscribe: () => void;
  let reasons: string[];

  beforeEach(() => {
    reasons = [];
    unsubscribe = subscribeSessionExpired((reason) => reasons.push(reason));
  });

  afterEach(() => {
    unsubscribe();
    vi.unstubAllGlobals();
  });

  it('emits session-expired when an authenticated call 401s', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: 'JWT expired' })),
    );

    await expect(apiGet('/api/wallet/history/abc', 'dead-token')).rejects.toThrow(
      ApiError,
    );
    expect(reasons).toEqual(['api_unauthorized']);
  });

  it('stays silent on a 401 for an unauthenticated call', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: 'Unauthorized' })),
    );

    await expect(apiGet('/api/public/thing', null)).rejects.toThrow(ApiError);
    expect(reasons).toEqual([]);
  });

  it('stays silent on non-401 failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { error: 'boom' })),
    );

    await expect(apiPost('/api/wallet/send', 'good-token', {})).rejects.toThrow(
      ApiError,
    );
    expect(reasons).toEqual([]);
  });

  it('preserves the 401 status on the thrown ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: 'JWT expired' })),
    );

    await expect(apiGet('/api/thing', 'dead-token')).rejects.toMatchObject({
      status: 401,
      message: 'JWT expired',
    });
  });
});
