import { describe, it, expect } from 'vitest';
import {
  USDC_DECIMALS,
  usdcToBaseUnits,
  baseUnitsToUsdc,
  UsdcYieldStatsSchema,
  UsdcYieldBalanceSchema,
  UnsignedReflectTxResponseSchema,
  UsdcYieldPositionSchema,
} from '../api/usdcYield';

describe('usdc unit conversion', () => {
  it('USDC has 6 decimals', () => {
    expect(USDC_DECIMALS).toBe(6);
  });

  it('usdcToBaseUnits scales by 1e6', () => {
    expect(usdcToBaseUnits(1)).toBe(1_000_000);
    expect(usdcToBaseUnits(2.5)).toBe(2_500_000);
    expect(usdcToBaseUnits(0)).toBe(0);
  });

  it('usdcToBaseUnits floors sub-unit precision (never over-credits)', () => {
    expect(usdcToBaseUnits(1.9999999)).toBe(1_999_999);
    expect(usdcToBaseUnits(0.0000019)).toBe(1);
  });

  it('baseUnitsToUsdc is the inverse', () => {
    expect(baseUnitsToUsdc(1_000_000)).toBe(1);
    expect(baseUnitsToUsdc(2_500_000)).toBe(2.5);
  });

  it('round-trips a clean amount', () => {
    expect(baseUnitsToUsdc(usdcToBaseUnits(42.123456))).toBeCloseTo(42.123456, 6);
  });
});

describe('UsdcYieldStatsSchema', () => {
  const valid = {
    rate: 1.04,
    receiptRate: 0.96,
    realtimeApy: 4.1,
    calculatedApy: 4.0,
    tvlUsd: 1_000_000,
    users: 1234,
    timestamp: '2026-06-03T12:00:00.000Z',
  };

  it('parses valid stats', () => {
    expect(UsdcYieldStatsSchema.parse(valid).calculatedApy).toBe(4.0);
  });

  it('rejects when a numeric field is the wrong type', () => {
    expect(() => UsdcYieldStatsSchema.parse({ ...valid, rate: '1.04' })).toThrow();
  });

  it('rejects when a field is missing', () => {
    const { rate, ...rest } = valid;
    void rate;
    expect(() => UsdcYieldStatsSchema.parse(rest)).toThrow();
  });
});

describe('UsdcYieldBalanceSchema', () => {
  const valid = {
    wallet: 'GsbwXfJraMomNxBcjK7xK2xQx5MdWXBfM6hVz7Qx5Mdw',
    ata: 'AtaXfJraMomNxBcjK7xK2xQx5MdWXBfM6hVz7Qx5Mdw',
    usdcPlusBaseUnits: 1_000_000,
    usdcPlusUiAmount: 1.0,
    rate: 1.04,
    usdValue: 1.04,
    ataExists: true,
  };

  it('parses a valid balance', () => {
    const parsed = UsdcYieldBalanceSchema.parse(valid);
    expect(parsed.usdcPlusUiAmount).toBe(1.0);
    expect(parsed.ataExists).toBe(true);
  });

  it('rejects a non-boolean ataExists', () => {
    expect(() =>
      UsdcYieldBalanceSchema.parse({ ...valid, ataExists: 'yes' }),
    ).toThrow();
  });
});

describe('UnsignedReflectTxResponseSchema', () => {
  const valid = {
    unsignedTransactionBase64: 'AQID',
    expectedReceivedBaseUnits: 960_000,
    minimumReceivedBaseUnits: 950_000,
    rate: 1.04,
    slippageBps: 50,
    signer: 'GsbwXfJraMomNxBcjK7xK2xQx5MdWXBfM6hVz7Qx5Mdw',
  };

  it('parses a valid build-mint/burn response', () => {
    expect(UnsignedReflectTxResponseSchema.parse(valid).slippageBps).toBe(50);
  });

  it('rejects when the unsigned tx is missing', () => {
    const { unsignedTransactionBase64, ...rest } = valid;
    void unsignedTransactionBase64;
    expect(() => UnsignedReflectTxResponseSchema.parse(rest)).toThrow();
  });
});

describe('UsdcYieldPositionSchema', () => {
  const valid = {
    _id: 'pos_1',
    userId: 'user_1',
    wallet: 'GsbwXfJraMomNxBcjK7xK2xQx5MdWXBfM6hVz7Qx5Mdw',
    walletContext: 'bank',
    operation: 'mint',
    txSignature: 'sig_1',
    usdcBaseUnits: 1_000_000,
    usdcPlusBaseUnits: 960_000,
    rate: 1.04,
    createdAt: '2026-06-03T12:00:00.000Z',
  };

  it('parses a valid position', () => {
    expect(UsdcYieldPositionSchema.parse(valid).operation).toBe('mint');
  });

  it('rejects an unknown walletContext', () => {
    expect(() =>
      UsdcYieldPositionSchema.parse({ ...valid, walletContext: 'cold' }),
    ).toThrow();
  });

  it('rejects an unknown operation', () => {
    expect(() =>
      UsdcYieldPositionSchema.parse({ ...valid, operation: 'swap' }),
    ).toThrow();
  });
});
