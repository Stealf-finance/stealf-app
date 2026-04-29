import { describe, expect, it } from 'vitest';
import { convertToMoproInputs } from '../zk/utils/moproInputs';

describe('convertToMoproInputs', () => {
  it('flattens bigint inputs into decimal string arrays', () => {
    const inputs = {
      a: 42n,
      b: [1n, 2n, 3n],
    };
    const out = convertToMoproInputs(inputs);
    expect(out).toEqual({
      a: ['42'],
      b: ['1', '2', '3'],
    });
  });

  it('flattens nested arrays into a single string[]', () => {
    const out = convertToMoproInputs({
      matrix: [
        [1n, 2n],
        [3n, 4n],
      ],
    });
    expect(out).toEqual({ matrix: ['1', '2', '3', '4'] });
  });

  it('coerces objects via their toString', () => {
    const inputs = {
      x: { toString: () => '0xabc' },
    };
    expect(convertToMoproInputs(inputs)).toEqual({ x: ['0xabc'] });
  });
});
