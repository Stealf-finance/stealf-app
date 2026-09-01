import { describe, it, expect } from 'vitest';
import { GRID_GAP, GRID_GUTTER, rowsOfTwo, tileWidth } from '../grid';

describe('tileWidth', () => {
  it('splits the content width evenly between two columns', () => {
    // 390 - 20*2 - 12 = 338, halved.
    expect(tileWidth(390)).toBe(169);
  });

  it('leaves exactly the gutters and the gap around two tiles', () => {
    const screen = 430;
    const used = tileWidth(screen) * 2 + GRID_GAP + GRID_GUTTER * 2;
    expect(used).toBe(screen);
  });
});

describe('rowsOfTwo', () => {
  it('pairs items in order', () => {
    expect(rowsOfTwo(['a', 'b', 'c', 'd'])).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('leaves an odd item alone in the last row', () => {
    expect(rowsOfTwo(['a', 'b', 'c'])).toEqual([['a', 'b'], ['c']]);
  });

  it('returns nothing for an empty list', () => {
    expect(rowsOfTwo([])).toEqual([]);
  });

  it('never puts more than two in a row', () => {
    for (const row of rowsOfTwo([1, 2, 3, 4, 5, 6, 7])) {
      expect(row.length).toBeLessThanOrEqual(2);
    }
  });
});
