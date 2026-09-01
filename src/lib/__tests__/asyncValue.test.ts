import { describe, expect, it } from 'vitest';
import { resolveValueState } from '@/src/lib/asyncValue';

describe('resolveValueState', () => {
  it('shows a skeleton while the value is unknown', () => {
    expect(resolveValueState(undefined, false)).toBe('skeleton');
  });

  it('keeps a real zero distinct from an unknown value', () => {
    expect(resolveValueState(0, false)).toBe('value');
    expect(resolveValueState(undefined, false)).toBe('skeleton');
  });

  it('reports the error only when there is nothing to show', () => {
    expect(resolveValueState(undefined, true)).toBe('error');
  });

  it('keeps a cached value on screen when a later refetch fails', () => {
    expect(resolveValueState(1234.5, true)).toBe('value');
  });
});
