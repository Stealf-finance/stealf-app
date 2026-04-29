import { describe, expect, it } from 'vitest';
import {
  convertZkProofToBytes,
  u256ToBeBytes,
} from '../zk/utils/proofConverter';
import type { U256 } from '@umbra-privacy/sdk/types';

describe('u256ToBeBytes', () => {
  it('encodes 0 as 32 zero bytes', () => {
    const out = u256ToBeBytes(0n as U256);
    expect(out.length).toBe(32);
    expect(Array.from(out).every((b) => b === 0)).toBe(true);
  });

  it('encodes a small value into the trailing byte (big-endian)', () => {
    const out = u256ToBeBytes(0xffn as U256);
    expect(out[31]).toBe(0xff);
    expect(out.slice(0, 31).every((b) => b === 0)).toBe(true);
  });

  it('encodes 2^192 with the high bit at byte 7', () => {
    const value = 1n << 192n;
    const out = u256ToBeBytes(value as U256);
    // byte 7 holds the lowest bit of the topmost 64-bit word -> 0x01
    expect(out[7]).toBe(0x01);
    expect(out[31]).toBe(0x00);
  });
});

describe('convertZkProofToBytes', () => {
  const validProof = {
    a: ['1', '2', '1'] as const,
    b: [
      ['3', '4'],
      ['5', '6'],
      ['1', '0'],
    ] as [[string, string], [string, string], [string, string]],
    c: ['7', '8', '1'] as const,
  };

  it('produces 64-byte A, 128-byte B, 64-byte C buffers', () => {
    const out = convertZkProofToBytes(validProof);
    expect(out.proofA.length).toBe(64);
    expect(out.proofB.length).toBe(128);
    expect(out.proofC.length).toBe(64);
  });

  it('rejects malformed pi_a (length != 3)', () => {
    expect(() =>
      convertZkProofToBytes({
        ...validProof,
        a: ['1', '2'] as unknown as readonly string[],
      }),
    ).toThrow(/pi_a/);
  });

  it('rejects malformed pi_b (rows must be arrays)', () => {
    expect(() =>
      convertZkProofToBytes({
        ...validProof,
        b: [
          'oops',
          ['5', '6'],
          ['1', '0'],
        ] as unknown as [
          [string, string],
          [string, string],
          [string, string],
        ],
      }),
    ).toThrow(/pi_b/);
  });

  it('swaps each row of pi_b ([Bay || Bax || Bby || Bbx])', () => {
    const out = convertZkProofToBytes(validProof);
    // First 32 bytes = u256(4) (Bay), next 32 = u256(3) (Bax)
    expect(out.proofB[31]).toBe(4);
    expect(out.proofB[63]).toBe(3);
    // Next: u256(6) then u256(5)
    expect(out.proofB[95]).toBe(6);
    expect(out.proofB[127]).toBe(5);
  });
});
