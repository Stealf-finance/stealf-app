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
