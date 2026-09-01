import { describe, expect, it } from 'vitest';
import { resolveCatalogueState } from '@/src/features/xstocks/lib/catalogueState';

describe('resolveCatalogueState', () => {
  it('holds the card with skeletons while the catalogue loads', () => {
    expect(resolveCatalogueState(undefined, false)).toBe('skeleton');
  });

  it('says so when the catalogue is unreachable, rather than vanishing', () => {
    // The card renders skeletons first, so hiding on error makes it appear and
    // then disappear — the regression this function exists to prevent.
    expect(resolveCatalogueState(undefined, true)).toBe('error');
  });

  it('hides the card only when the catalogue is genuinely empty', () => {
    expect(resolveCatalogueState([], false)).toBe('hidden');
  });

  it('separates an empty catalogue from an unreachable one', () => {
    expect(resolveCatalogueState([], false)).toBe('hidden');
    expect(resolveCatalogueState(undefined, true)).toBe('error');
  });

  it('keeps showing cached rows when a later refetch fails', () => {
    expect(resolveCatalogueState([{}, {}], true)).toBe('rows');
  });
});
