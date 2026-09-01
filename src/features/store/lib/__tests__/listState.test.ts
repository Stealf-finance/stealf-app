import { describe, it, expect } from 'vitest';
import { ApiError } from '@/src/services/api/errors';
import { resolveDetailState, resolveStoreState } from '../listState';

const groups = [{ group: 'ecommerce', products: [] }];

describe('resolveStoreState', () => {
  it('shows a skeleton while nothing has arrived and nothing failed', () => {
    expect(resolveStoreState(undefined, null)).toBe('skeleton');
  });

  it('shows the groups once they arrive', () => {
    expect(resolveStoreState(groups, null)).toBe('groups');
  });

  it('keeps a loaded catalog when a background refetch fails', () => {
    expect(resolveStoreState(groups, new ApiError('boom', 500))).toBe('groups');
  });

  it('treats an empty catalog as loaded, not as loading', () => {
    expect(resolveStoreState([], null)).toBe('groups');
  });

  it('reads 503 as the feature being off, not as an error', () => {
    const err = new ApiError('Gift cards are not available yet', 503);
    expect(resolveStoreState(undefined, err)).toBe('unavailable');
  });

  it('reads any other status as an error', () => {
    expect(resolveStoreState(undefined, new ApiError('nope', 500))).toBe(
      'error',
    );
  });

  it('reads a non-API failure as an error', () => {
    expect(resolveStoreState(undefined, new Error('offline'))).toBe('error');
  });
});

describe('resolveDetailState', () => {
  it('separates "catalog loaded but no such product" from a failure', () => {
    expect(resolveDetailState(groups, null, false)).toBe('missing');
  });

  it('resolves the product when it is there', () => {
    expect(resolveDetailState(groups, null, true)).toBe('groups');
  });

  it('never reports missing before the catalog has loaded', () => {
    expect(resolveDetailState(undefined, null, false)).toBe('skeleton');
  });

  it('reports the feature being off ahead of a missing product', () => {
    const err = new ApiError('Gift cards are not available yet', 503);
    expect(resolveDetailState(undefined, err, false)).toBe('unavailable');
  });
});
