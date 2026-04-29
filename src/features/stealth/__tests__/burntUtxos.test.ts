import { describe, expect, it } from 'vitest';
import { isAlreadyBurntError, utxoToId } from '../lib/burntUtxos';

describe('utxoToId', () => {
  it('joins treeIndex:insertionIndex', () => {
    expect(utxoToId({ treeIndex: 3n, insertionIndex: 17n })).toBe('3:17');
  });

  it('falls back to 0:"" when fields are missing', () => {
    expect(utxoToId({})).toBe('0:');
  });

  it('handles plain numbers without a toString surprise', () => {
    expect(utxoToId({ treeIndex: 0, insertionIndex: 42 })).toBe('0:42');
  });
});

describe('isAlreadyBurntError', () => {
  it('matches the canonical NullifierAlreadyBurnt name', () => {
    expect(isAlreadyBurntError(new Error('NullifierAlreadyBurnt'))).toBe(true);
  });

  it('matches the human-readable variant', () => {
    expect(isAlreadyBurntError(new Error('this UTXO is already burnt'))).toBe(true);
  });

  it('matches the on-chain hex code 0x6d64', () => {
    expect(isAlreadyBurntError({ message: 'custom program error 0x6d64' })).toBe(true);
  });

  it('matches the cause chain when the top message is generic', () => {
    expect(
      isAlreadyBurntError({
        message: 'tx failed',
        cause: { message: 'NullifierAlreadyBurnt' },
      }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isAlreadyBurntError(new Error('insufficient funds'))).toBe(false);
  });
});
