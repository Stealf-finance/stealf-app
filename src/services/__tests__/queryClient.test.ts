import { describe, expect, it, vi } from 'vitest';
import type { Query } from '@tanstack/react-query';

// AsyncStorage is RN-only; vitest runs under node. Mock the import so the
// queryClient module can be evaluated without pulling the native bridge.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// eslint-disable-next-line import/first -- vi.mock above must hoist before this
import { shouldPersistQuery, shouldRetryQuery } from '@/src/services/queryClient';
// eslint-disable-next-line import/first
import { ApiError } from '@/src/services/api/errors';

type QueryStatus = 'success' | 'pending' | 'error';

function queryWithKey(
  queryKey: readonly unknown[],
  status: QueryStatus = 'success',
): Query {
  // `shouldPersistQuery` reads `queryKey` plus the state fields
  // `defaultShouldDehydrateQuery` inspects; the rest of `Query` would be a
  // huge mock surface. Cast through unknown to avoid that.
  return {
    queryKey,
    state: { status, fetchStatus: 'idle', data: status === 'success' ? {} : undefined },
    meta: undefined,
  } as unknown as Query;
}

describe('shouldPersistQuery', () => {
  it('persists wallet-balance queries', () => {
    expect(
      shouldPersistQuery(queryWithKey(['wallet-balance', 'someAddress'])),
    ).toBe(true);
  });

  it('persists wallet-history queries', () => {
    expect(
      shouldPersistQuery(queryWithKey(['wallet-history', 'someAddress'])),
    ).toBe(true);
  });

  it('persists sol-price queries', () => {
    expect(shouldPersistQuery(queryWithKey(['sol-price']))).toBe(true);
  });

  it('persists user-profile queries (no PII in payload)', () => {
    expect(
      shouldPersistQuery(queryWithKey(['user-profile', 'bankWalletAddr'])),
    ).toBe(true);
  });

  it('denies encrypted-balances (sensitive amountRaw + bigint)', () => {
    expect(
      shouldPersistQuery(
        queryWithKey([
          'stealth',
          'encrypted-balances',
          'stealfWalletAddr',
          'SOL_MINT',
        ]),
      ),
    ).toBe(false);
  });

  it('denies claim-scan (uses its own Merkle cursor cache)', () => {
    expect(
      shouldPersistQuery(
        queryWithKey(['stealth', 'claim-scan', 'stealfWalletAddr']),
      ),
    ).toBe(false);
  });

  it('denies umbra-registration (per-session probe)', () => {
    expect(
      shouldPersistQuery(
        queryWithKey(['stealth', 'registration', 'walletAddr']),
      ),
    ).toBe(false);
  });

  it('denies queries with a non-string root key', () => {
    expect(shouldPersistQuery(queryWithKey([{}, 'x']))).toBe(false);
  });

  it('denies queries with an unknown root prefix (allowlist-only)', () => {
    expect(
      shouldPersistQuery(queryWithKey(['some-future-feature', 'arg'])),
    ).toBe(false);
  });

  // Regression: the allowlist used to replace `defaultShouldDehydrateQuery`
  // outright, so an in-flight prefetch was persisted in `pending` state and
  // React Query warned "dehydrated as pending ended up rejecting" on rehydrate.
  it('denies an allowlisted query that is still pending', () => {
    expect(
      shouldPersistQuery(queryWithKey(['wallet-history', 'addr'], 'pending')),
    ).toBe(false);
  });

  it('denies an allowlisted query that errored', () => {
    expect(
      shouldPersistQuery(queryWithKey(['wallet-history', 'addr'], 'error')),
    ).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it('does not retry a 401 — the token is dead, not the network', () => {
    expect(shouldRetryQuery(0, new ApiError('JWT expired', 401))).toBe(false);
  });

  it('does not retry a 403', () => {
    expect(shouldRetryQuery(0, new ApiError('Forbidden', 403))).toBe(false);
  });

  it('retries a 500 once', () => {
    expect(shouldRetryQuery(0, new ApiError('boom', 500))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError('boom', 500))).toBe(false);
  });

  it('retries a non-ApiError once', () => {
    expect(shouldRetryQuery(0, new Error('network down'))).toBe(true);
    expect(shouldRetryQuery(1, new Error('network down'))).toBe(false);
  });
});
