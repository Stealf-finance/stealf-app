import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

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

const persister = createAsyncStoragePersister({
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
