import { describe, it, expect } from 'vitest';
import { indexFromPosition, positionForIndex } from '../slider';

describe('indexFromPosition', () => {
  it('snaps to the nearest stop', () => {
    expect(indexFromPosition(0, 300, 4)).toBe(0);
    expect(indexFromPosition(300, 300, 4)).toBe(3);
    expect(indexFromPosition(155, 300, 4)).toBe(2);
  });

  it('clamps a drag past either end', () => {
    expect(indexFromPosition(-80, 300, 4)).toBe(0);
    expect(indexFromPosition(999, 300, 4)).toBe(3);
  });

  it('is safe before layout, and with a single stop', () => {
    expect(indexFromPosition(120, 0, 4)).toBe(0);
    expect(indexFromPosition(120, 300, 1)).toBe(0);
  });
});

describe('positionForIndex', () => {
  it('spreads the stops evenly across the travel', () => {
    expect(positionForIndex(0, 300, 4)).toBe(0);
    expect(positionForIndex(3, 300, 4)).toBe(300);
    expect(positionForIndex(1, 300, 4)).toBeCloseTo(100);
  });

  it('clamps an index outside the list', () => {
    expect(positionForIndex(9, 300, 4)).toBe(300);
    expect(positionForIndex(-2, 300, 4)).toBe(0);
  });

  it('round-trips with indexFromPosition', () => {
    for (let i = 0; i < 6; i += 1) {
      expect(indexFromPosition(positionForIndex(i, 280, 6), 280, 6)).toBe(i);
    }
  });
});
