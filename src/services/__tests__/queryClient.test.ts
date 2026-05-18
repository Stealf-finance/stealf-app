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
import { shouldPersistQuery } from '@/src/services/queryClient';

function queryWithKey(queryKey: readonly unknown[]): Query {
  // Only `queryKey` is read by `shouldPersistQuery`; the rest of `Query`
  // would be a huge mock surface. Cast through unknown to avoid that.
  return { queryKey } as unknown as Query;
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
});
