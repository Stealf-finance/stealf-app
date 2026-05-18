import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// gcTime must be >= persistence maxAge so a hydrated entry doesn't get
// garbage-collected before its observer subscribes on the next cold start.
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      gcTime: PERSIST_MAX_AGE_MS,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// AsyncStorage on iOS is unencrypted by default (file protection
// `NSFileProtectionCompleteUntilFirstUserAuthentication`) — jailbreak /
// iTunes backup dumps can read its contents. We only persist caches that
// are either public on-chain (balance, history, SOL price) or already
// surfaced to the client via other paths (user profile keyed by
// `subOrgId`, which is the telemetry identifier — never email or PII).
// Encrypted-balance UTXOs, claim-scan state, and Umbra registration
// probes are explicitly excluded — see PR description for the rationale.
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

const PERSIST_ALLOWED_PREFIXES: ReadonlySet<string> = new Set([
  'wallet-balance', // balanceQueries.byAddress(*)
  'wallet-history', // historyQueries.byAddress(*)
  'sol-price', // solPriceQueries.all
  'user-profile', // userProfileQueries.byBankWallet(*)
]);

// `stealth` covers encrypted-balances (sensitive amountRaw + bigint
// payload), claim-scan (uses its own incremental Merkle cursor cache),
// and umbra-registration (per-session probe, stale value would skip
// setup). Always denied.
const PERSIST_DENIED_PREFIXES: ReadonlySet<string> = new Set(['stealth']);

export function shouldPersistQuery(query: Query): boolean {
  const root = query.queryKey[0];
  if (typeof root !== 'string') return false;
  if (PERSIST_DENIED_PREFIXES.has(root)) return false;
  return PERSIST_ALLOWED_PREFIXES.has(root);
}

export const PERSIST_OPTIONS = {
  persister,
  // Bump this string to forcefully invalidate every existing persisted
  // cache — for example, after a schema change on balance/history.
  buster: 'v1',
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
  },
} as const;
