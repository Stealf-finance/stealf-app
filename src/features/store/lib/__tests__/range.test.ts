import { describe, it, expect } from 'vitest';
import { rangeAmountError, snapToRange } from '../range';

const range = { min: 10, max: 500, step: 5 };

describe('rangeAmountError', () => {
  it('accepts an amount on a step inside the bounds', () => {
    expect(rangeAmountError(25, range, 'EUR')).toBeNull();
  });

  it('rejects an amount below the minimum', () => {
    expect(rangeAmountError(5, range, 'EUR')).toBe('Minimum €10');
  });

  it('rejects an amount above the maximum', () => {
    expect(rangeAmountError(600, range, 'EUR')).toBe('Maximum €500');
  });

  it('rejects an amount off the step', () => {
    expect(rangeAmountError(27, range, 'EUR')).toBe('Use steps of €5');
  });

  it('rejects a blank or zero amount', () => {
    expect(rangeAmountError(0, range, 'EUR')).toBe('Enter an amount');
    expect(rangeAmountError(Number.NaN, range, 'EUR')).toBe('Enter an amount');
  });

  it('measures the step from the minimum, not from zero', () => {
    expect(rangeAmountError(13, { min: 3, max: 100, step: 5 }, 'EUR')).toBeNull();
  });

  it('handles a decimal step without float drift', () => {
    const decimal = { min: 0.1, max: 10, step: 0.1 };
    expect(rangeAmountError(0.3, decimal, 'EUR')).toBeNull();
  });

  it('skips the bound checks a product does not declare', () => {
    expect(rangeAmountError(9999, { step: 1 }, 'EUR')).toBeNull();
  });
});

describe('snapToRange', () => {
  it('snaps to the nearest step', () => {
    expect(snapToRange(27, range)).toBe(25);
    expect(snapToRange(28, range)).toBe(30);
  });

  it('never returns less than the minimum', () => {
    expect(snapToRange(1, range)).toBe(10);
  });

  it('never returns more than the maximum', () => {
    expect(snapToRange(9999, range)).toBe(500);
  });

  it('leaves an amount alone when there is no step', () => {
    expect(snapToRange(37, { min: 10, max: 500 })).toBe(37);
  });
});
