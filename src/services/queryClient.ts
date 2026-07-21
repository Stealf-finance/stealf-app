import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QueryClient,
  defaultShouldDehydrateQuery,
  type Query,
} from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ApiError } from './api/errors';

const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// A 401/403 means the JWT is dead, not that the network blipped. Retrying
// replays the same expired token and just delays the teardown.
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return false;
  }
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 30 * 1000,
      gcTime: PERSIST_MAX_AGE_MS,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

const PERSIST_ALLOWED_PREFIXES: ReadonlySet<string> = new Set([
  'wallet-balance',
  'wallet-history',
  'sol-price',
  'user-profile',
]);

const PERSIST_DENIED_PREFIXES: ReadonlySet<string> = new Set(['stealth']);

export function shouldPersistQuery(query: Query): boolean {
  // Compose with the library default rather than replacing it. The default
  // rejects any query not in a `success` state; dropping that check persisted
  // in-flight prefetches as `pending`, which React Query then warns about on
  // rehydrate ("dehydrated as pending ended up rejecting").
  if (!defaultShouldDehydrateQuery(query)) return false;
  const root = query.queryKey[0];
  if (typeof root !== 'string') return false;
  if (PERSIST_DENIED_PREFIXES.has(root)) return false;
  return PERSIST_ALLOWED_PREFIXES.has(root);
}

export const PERSIST_OPTIONS = {
  persister,
  buster: 'v1',
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
  },
} as const;
