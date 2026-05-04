import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTtlCache } from '../ttlCache';

describe('createTtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when nothing has been set', () => {
    const cache = createTtlCache<string>(1000);
    expect(cache.get()).toBeNull();
  });

  it('returns the cached value while inside the TTL window', () => {
    const cache = createTtlCache<string>(5_000);
    cache.set('manifest-v3');
    expect(cache.get()).toBe('manifest-v3');

    vi.advanceTimersByTime(4_999);
    expect(cache.get()).toBe('manifest-v3');
  });

  it('expires once the TTL elapses', () => {
    const cache = createTtlCache<string>(5_000);
    cache.set('manifest-v3');
    vi.advanceTimersByTime(5_001);
    expect(cache.get()).toBeNull();
  });

  it('clear() drops the cached value before TTL', () => {
    const cache = createTtlCache<string>(60_000);
    cache.set('manifest-v3');
    cache.clear();
    expect(cache.get()).toBeNull();
  });

  it('set() refreshes the expiry on overwrite', () => {
    const cache = createTtlCache<string>(5_000);
    cache.set('manifest-v3');
    vi.advanceTimersByTime(4_000);
    cache.set('manifest-v4');
    vi.advanceTimersByTime(4_000);
    // 8s after first set, 4s after second — second is still alive.
    expect(cache.get()).toBe('manifest-v4');
  });

  it('treats values structurally (objects retain identity)', () => {
    const cache = createTtlCache<{ v: string }>(1_000);
    const value = { v: 'abc' };
    cache.set(value);
    expect(cache.get()).toBe(value);
  });
});
