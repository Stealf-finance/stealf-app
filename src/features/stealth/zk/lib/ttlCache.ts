/**
 * Tiny single-slot TTL cache. Used by the ZK asset service to avoid
 * hitting the manifest CDN on every `getZKey` call — once we know the
 * manifest version for a few minutes, every prover in flight can reuse
 * it and only hit the network when the cached entry has expired.
 */
export interface TtlCache<T> {
  get(): T | null;
  set(value: T): void;
  clear(): void;
}

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  let entry: { value: T; expiresAt: number } | null = null;
  return {
    get: () =>
      entry !== null && entry.expiresAt > Date.now() ? entry.value : null,
    set: (value: T) => {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
    clear: () => {
      entry = null;
    },
  };
}
