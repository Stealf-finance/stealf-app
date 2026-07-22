import { describe, expect, it } from 'vitest';
import { splitUsd } from '../formatUsd';

describe('splitUsd', () => {
  it('splits a positive amount into grouped int and 2-dp decimals', () => {
    expect(splitUsd(1234.5)).toEqual({ int: '1,234', dec: '.50' });
  });
  it('pads and groups zero', () => {
    expect(splitUsd(0)).toEqual({ int: '0', dec: '.00' });
  });
  it('prefixes a minus and keeps the grouped magnitude', () => {
    expect(splitUsd(-42.07)).toEqual({ int: '-42', dec: '.07' });
  });
});
