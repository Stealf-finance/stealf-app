import { describe, expect, it } from 'vitest';
import { encodeTransferLamports, lamportsForSol } from '../lib/buildTransfer';

describe('lamportsForSol', () => {
  it('converts whole SOL to lamports', () => {
    expect(lamportsForSol(1)).toBe(1_000_000_000n);
  });

  it('rounds fractional lamports to floor', () => {
    expect(lamportsForSol(0.0000001)).toBe(100n);
  });

  it('rejects negative values', () => {
    expect(() => lamportsForSol(-1)).toThrow();
  });

  it('rejects NaN / Infinity', () => {
    expect(() => lamportsForSol(Number.NaN)).toThrow();
    expect(() => lamportsForSol(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('encodeTransferLamports', () => {
  it('produces a 12-byte buffer with instruction tag 2', () => {
    const out = encodeTransferLamports(123n);
    expect(out.byteLength).toBe(12);
    // instruction tag is the first u32 little-endian
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    expect(view.getUint32(0, true)).toBe(2);
    expect(view.getBigUint64(4, true)).toBe(123n);
  });
});
