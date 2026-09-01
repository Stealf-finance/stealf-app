import { describe, expect, it } from 'vitest';
import { resolveAssetsState } from '@/src/features/wallet-detail/lib/loadingState';

describe('resolveAssetsState', () => {
  it('shows skeleton rows while the list is unknown', () => {
    expect(resolveAssetsState(undefined, false, false)).toBe('skeleton');
  });

  it('separates an unknown list from a genuinely empty one', () => {
    expect(resolveAssetsState(undefined, false, false)).toBe('skeleton');
    expect(resolveAssetsState([], false, false)).toBe('empty');
  });

  it('renders rows once holdings arrive', () => {
    expect(resolveAssetsState([{}, {}], false, false)).toBe('rows');
  });

  it('reports the error only when there is nothing to render', () => {
    expect(resolveAssetsState(undefined, true, false)).toBe('error');
    expect(resolveAssetsState([{}], true, false)).toBe('rows');
  });

  it('suppresses both placeholders when a footer owns the screen', () => {
    expect(resolveAssetsState(undefined, false, true)).toBe('hidden');
    expect(resolveAssetsState([], true, true)).toBe('hidden');
  });

  it('still surfaces a failure even behind a footer', () => {
    expect(resolveAssetsState(undefined, true, true)).toBe('error');
  });
});
