import { describe, expect, it } from 'vitest';
import { truncateAddress } from '../lib/address';

const KEY = 'FpRVZrZ7zAigWG4mGMirCJMibxedQ4DmMcQCo3p94nwF';

describe('truncateAddress', () => {
  it('keeps the head and tail of a base58 key', () => {
    expect(truncateAddress(KEY)).toBe('FpRVZr…4nwF');
  });

  it('honours custom head and tail widths', () => {
    expect(truncateAddress(KEY, 4, 6)).toBe('FpRV…p94nwF');
  });

  it('leaves .sol names and labels whole', () => {
    expect(truncateAddress('thomas.sol')).toBe('thomas.sol');
    expect(truncateAddress('Cash account')).toBe('Cash account');
  });

  it('trims before measuring', () => {
    expect(truncateAddress(`  ${KEY}  `)).toBe('FpRVZr…4nwF');
  });

  it('passes short input through untouched', () => {
    expect(truncateAddress('')).toBe('');
    expect(truncateAddress('abc')).toBe('abc');
  });
});
