import { describe, it, expect } from 'vitest';
import {
  SOL_DECIMALS,
  JITOSOL_DECIMALS,
  solToLamports,
  lamportsToSol,
  jitoSolToBaseUnits,
  baseUnitsToJitoSol,
  BuildStakeResponseSchema,
  BuildUnstakeResponseSchema,
  ExecuteResponseSchema,
} from '../api/jitoStake';

describe('jitoStake unit conversion', () => {
  it('SOL and JitoSOL both have 9 decimals', () => {
    expect(SOL_DECIMALS).toBe(9);
    expect(JITOSOL_DECIMALS).toBe(9);
  });

  it('solToLamports scales by 1e9', () => {
    expect(solToLamports(1)).toBe(1_000_000_000);
    expect(solToLamports(0.5)).toBe(500_000_000);
    expect(solToLamports(0)).toBe(0);
  });

  it('solToLamports floors sub-lamport precision (never over-stakes)', () => {
    expect(solToLamports(1.9999999999)).toBe(1_999_999_999);
    expect(solToLamports(0.0000000019)).toBe(1);
  });

  it('lamportsToSol is the inverse', () => {
    expect(lamportsToSol(1_000_000_000)).toBe(1);
    expect(lamportsToSol(500_000_000)).toBe(0.5);
  });

  it('jitoSolToBaseUnits floors and baseUnitsToJitoSol inverts', () => {
    expect(jitoSolToBaseUnits(1.999999999_9)).toBe(1_999_999_999);
    expect(baseUnitsToJitoSol(1_000_000_000)).toBe(1);
  });
});

describe('jitoStake response schemas', () => {
  it('parses a valid build-stake response', () => {
    const parsed = BuildStakeResponseSchema.parse({
      requestId: 'req-1',
      unsignedTransactionBase64: 'BASE64',
      inSolLamports: 1_000_000_000,
      outJitoSolBaseUnits: 970_000_000,
      slippageBps: 50,
    });
    expect(parsed.outJitoSolBaseUnits).toBe(970_000_000);
  });

  it('parses a valid build-unstake response', () => {
    const parsed = BuildUnstakeResponseSchema.parse({
      requestId: 'req-2',
      unsignedTransactionBase64: 'BASE64',
      inJitoSolBaseUnits: 250_000_000,
      outSolLamports: 258_000_000,
      slippageBps: 50,
    });
    expect(parsed.outSolLamports).toBe(258_000_000);
  });

  it('rejects a build-stake response with a missing field', () => {
    expect(() =>
      BuildStakeResponseSchema.parse({
        requestId: 'req-1',
        unsignedTransactionBase64: 'BASE64',
        // inSolLamports missing
        outJitoSolBaseUnits: 970_000_000,
        slippageBps: 50,
      }),
    ).toThrow();
  });

  it('parses an execute response', () => {
    const parsed = ExecuteResponseSchema.parse({
      status: 'Success',
      signature: 'SIG',
    });
    expect(parsed.status).toBe('Success');
  });
});
