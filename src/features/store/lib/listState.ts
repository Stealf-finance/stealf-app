import { ApiError } from '@/src/services/api/errors';

export type StoreListState = 'groups' | 'skeleton' | 'unavailable' | 'error';

/** A value always wins; 503 means "feature off", not a failure. See STORE.md. */
export function resolveStoreState(
  groups: readonly unknown[] | undefined,
  error: unknown,
): StoreListState {
  if (groups !== undefined) return 'groups';
  if (error == null) return 'skeleton';
  return error instanceof ApiError && error.status === 503
    ? 'unavailable'
    : 'error';
}

export type StoreDetailState = StoreListState | 'missing';

/** Same rule as the list, plus "loaded but this id isn't in the catalog". */
export function resolveDetailState(
  groups: readonly unknown[] | undefined,
  error: unknown,
  found: boolean,
): StoreDetailState {
  const state = resolveStoreState(groups, error);
  if (state !== 'groups') return state;
  return found ? 'groups' : 'missing';
}
