/**
 * What to render for a value that may not have arrived yet.
 *
 * React Query makes three situations easy to confuse: a query in flight, one
 * still disabled while auth hydrates, and one that failed. The first two are
 * indistinguishable to a caller — both simply have no data — and both must
 * read as "unknown". Keying off the absence of a value rather than a flag
 * covers all three, where `isLoading` misses the disabled case (it reports
 * `false` there, with nothing to show).
 */
export type AsyncValueState = 'value' | 'skeleton' | 'error';

/**
 * A value that exists always wins, error or not: when a background refetch
 * fails on top of cached data, the cached figure stays on screen rather than
 * collapsing into an error.
 */
export function resolveValueState(
  value: unknown,
  error: boolean,
): AsyncValueState {
  if (value !== undefined) return 'value';
  return error ? 'error' : 'skeleton';
}
