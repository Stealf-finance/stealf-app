import { describe, expect, it } from 'vitest';
import { resolveSwipeTarget } from '../swipePagerLogic';

const base = { count: 4, pageWidth: 300 };

describe('resolveSwipeTarget', () => {
  it('stays on a small, slow drag', () => {
    expect(resolveSwipeTarget({ ...base, index: 1, translationX: -40, velocityX: 100 })).toBe(1);
  });
  it('advances on a long left drag', () => {
    expect(resolveSwipeTarget({ ...base, index: 1, translationX: -160, velocityX: 0 })).toBe(2);
  });
  it('goes back on a long right drag', () => {
    expect(resolveSwipeTarget({ ...base, index: 2, translationX: 160, velocityX: 0 })).toBe(1);
  });
  it('advances on a fast flick even if short', () => {
    expect(resolveSwipeTarget({ ...base, index: 0, translationX: -20, velocityX: -900 })).toBe(1);
  });
  it('clamps at the last page', () => {
    expect(resolveSwipeTarget({ ...base, index: 3, translationX: -200, velocityX: -900 })).toBe(3);
  });
  it('clamps at the first page', () => {
    expect(resolveSwipeTarget({ ...base, index: 0, translationX: 200, velocityX: 900 })).toBe(0);
  });
});
