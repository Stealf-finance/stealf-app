import { describe, it, expect } from 'vitest';
import {
  USDC_DECIMALS,
  usdcToBaseUnits,
  baseUnitsToUsdc,
  XstockAssetSchema,
  XstockDetailSchema,
  XstockBalanceSchema,
  BuildBuyResponseSchema,
  BuildSellResponseSchema,
  ExecuteResponseSchema,
} from '../api/xstocks';

describe('usdc unit conversion', () => {
  it('USDC has 6 decimals', () => {
    expect(USDC_DECIMALS).toBe(6);
  });

  it('usdcToBaseUnits scales by 1e6', () => {
    expect(usdcToBaseUnits(1)).toBe(1_000_000);
    expect(usdcToBaseUnits(2.5)).toBe(2_500_000);
    expect(usdcToBaseUnits(0)).toBe(0);
  });

  it('usdcToBaseUnits floors sub-unit precision (never over-spends)', () => {
    expect(usdcToBaseUnits(1.9999999)).toBe(1_999_999);
    expect(usdcToBaseUnits(0.0000019)).toBe(1);
  });

  it('baseUnitsToUsdc is the inverse', () => {
    expect(baseUnitsToUsdc(1_000_000)).toBe(1);
    expect(baseUnitsToUsdc(2_500_000)).toBe(2.5);
  });

  it('round-trips a clean amount', () => {
    expect(baseUnitsToUsdc(usdcToBaseUnits(42.123456))).toBeCloseTo(
      42.123456,
      6,
    );
  });
});

const validAsset = {
  id: 'aapl-x',
  symbol: 'AAPLx',
  name: 'Apple xStock',
  underlyingSymbol: 'AAPL',
  isin: 'US0378331005',
  logo: 'https://example.com/aapl.png',
  mint: 'XsMintAaplxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  tokenProgram: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  isTradingHalted: false,
};

const validMultiplier = {
  currentMultiplier: 1,
  newMultiplier: 1,
  activationDateTime: '2026-06-03T12:00:00.000Z',
  reason: 'none',
};

const validStatus = {
  symbol: 'AAPLx',
  isMarketTradingHalted: false,
  isAtomicTradingHalted: false,
};

describe('XstockAssetSchema', () => {
  it('parses a valid asset', () => {
    const parsed = XstockAssetSchema.parse(validAsset);
    expect(parsed.symbol).toBe('AAPLx');
    expect(parsed.isTradingHalted).toBe(false);
  });

  it('rejects when a required field is missing', () => {
    const { mint, ...rest } = validAsset;
    void mint;
    expect(() => XstockAssetSchema.parse(rest)).toThrow();
  });

  it('rejects a non-boolean isTradingHalted', () => {
    expect(() =>
      XstockAssetSchema.parse({ ...validAsset, isTradingHalted: 'no' }),
    ).toThrow();
  });
});

describe('XstockDetailSchema', () => {
  const valid = {
    ...validAsset,
    referencePrice: 192.34,
    multiplier: validMultiplier,
    status: validStatus,
  };

  it('parses a valid detail', () => {
    const parsed = XstockDetailSchema.parse(valid);
    expect(parsed.referencePrice).toBe(192.34);
    expect(parsed.status.isMarketTradingHalted).toBe(false);
  });

  it('accepts a null reference price', () => {
    expect(
      XstockDetailSchema.parse({ ...valid, referencePrice: null })
        .referencePrice,
    ).toBeNull();
  });

  it('rejects when the multiplier is missing', () => {
    const { multiplier, ...rest } = valid;
    void multiplier;
    expect(() => XstockDetailSchema.parse(rest)).toThrow();
  });
});

describe('XstockBalanceSchema', () => {
  const valid = {
    wallet: 'GsbwXfJraMomNxBcjK7xK2xQx5MdWXBfM6hVz7Qx5Mdw',
    symbol: 'AAPLx',
    ata: 'AtaXfJraMomNxBcjK7xK2xQx5MdWXBfM6hVz7Qx5Mdw',
    rawBaseUnits: 150_000_000,
    uiAmount: 1.5,
    uiAmountString: '1.5',
    ataExists: true,
  };

  it('parses a valid balance', () => {
    const parsed = XstockBalanceSchema.parse(valid);
    expect(parsed.uiAmount).toBe(1.5);
    expect(parsed.rawBaseUnits).toBe(150_000_000);
  });

  it('rejects a non-boolean ataExists', () => {
    expect(() =>
      XstockBalanceSchema.parse({ ...valid, ataExists: 'yes' }),
    ).toThrow();
  });

  it('rejects when rawBaseUnits is missing', () => {
    const { rawBaseUnits, ...rest } = valid;
    void rawBaseUnits;
    expect(() => XstockBalanceSchema.parse(rest)).toThrow();
  });
});

describe('BuildBuyResponseSchema', () => {
  const valid = {
    symbol: 'AAPLx',
    mint: 'XsMintAaplxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    requestId: 'req_1',
    unsignedTransactionBase64: 'AQID',
    inUsdcBaseUnits: 10_000_000,
    outXstockRawBaseUnits: 5_200_000,
    referencePrice: 192.34,
    multiplier: validMultiplier,
    slippageBps: 50,
  };

  it('parses a valid build-buy response', () => {
    expect(BuildBuyResponseSchema.parse(valid).requestId).toBe('req_1');
  });

  it('rejects when the unsigned tx is missing', () => {
    const { unsignedTransactionBase64, ...rest } = valid;
    void unsignedTransactionBase64;
    expect(() => BuildBuyResponseSchema.parse(rest)).toThrow();
  });
});

describe('BuildSellResponseSchema', () => {
  const valid = {
    symbol: 'AAPLx',
    mint: 'XsMintAaplxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    requestId: 'req_2',
    unsignedTransactionBase64: 'AQID',
    inXstockRawBaseUnits: 5_200_000,
    outUsdcBaseUnits: 9_950_000,
    referencePrice: 192.34,
    multiplier: validMultiplier,
    slippageBps: 50,
  };

  it('parses a valid build-sell response', () => {
    expect(BuildSellResponseSchema.parse(valid).outUsdcBaseUnits).toBe(
      9_950_000,
    );
  });

  it('rejects when requestId is missing', () => {
    const { requestId, ...rest } = valid;
    void requestId;
    expect(() => BuildSellResponseSchema.parse(rest)).toThrow();
  });
});

describe('ExecuteResponseSchema', () => {
  const valid = { status: 'confirmed', signature: 'sig_1' };

  it('parses a valid execute response', () => {
    expect(ExecuteResponseSchema.parse(valid).signature).toBe('sig_1');
  });

  it('rejects when signature is missing', () => {
    const { signature, ...rest } = valid;
    void signature;
    expect(() => ExecuteResponseSchema.parse(rest)).toThrow();
  });
});
