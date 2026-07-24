import { describe, expect, it } from 'vitest';
import { SolanaXstockSchema, XstockDetailSchema } from '../api/assets';
import { XstockBalanceSchema } from '../api/balance';

const asset = {
  id: 'aapl',
  symbol: 'AAPLx',
  name: 'Apple',
  underlyingSymbol: 'AAPL',
  isin: 'US0378331005',
  logo: 'https://example.com/aapl.png',
  mint: 'MintAddr',
  tokenProgram: 'Token2022',
  isTradingHalted: false,
};

describe('SolanaXstockSchema', () => {
  it('parses a catalogue asset', () => {
    expect(SolanaXstockSchema.parse(asset).symbol).toBe('AAPLx');
  });

  it('rejects a missing required field', () => {
    const { mint, ...noMint } = asset;
    void mint;
    expect(() => SolanaXstockSchema.parse(noMint)).toThrow();
  });
});

describe('XstockDetailSchema', () => {
  const detail = {
    ...asset,
    referencePrice: 231.4,
    priceChange24h: 1.29,
    multiplier: 1,
    status: {
      symbol: 'AAPLx',
      isMarketTradingHalted: false,
      isAtomicTradingHalted: false,
    },
  };

  it('parses detail with price, 24h change + status', () => {
    const parsed = XstockDetailSchema.parse(detail);
    expect(parsed.referencePrice).toBe(231.4);
    expect(parsed.priceChange24h).toBe(1.29);
  });

  it('tolerates a null / omitted 24h change', () => {
    expect(XstockDetailSchema.parse({ ...detail, priceChange24h: null }).priceChange24h).toBeNull();
    const { priceChange24h, ...noChange } = detail;
    void priceChange24h;
    expect(XstockDetailSchema.parse(noChange).priceChange24h).toBeUndefined();
  });
});

describe('XstockBalanceSchema', () => {
  const bal = {
    wallet: 'w',
    symbol: 'AAPLx',
    ata: 'a',
    rawBaseUnits: 1_500_000,
    uiAmount: 1.5,
    uiAmountString: '1.5',
    ataExists: true,
  };

  it('parses a balance payload', () => {
    expect(XstockBalanceSchema.parse(bal).rawBaseUnits).toBe(1_500_000);
  });

  it('accepts a null uiAmount', () => {
    expect(XstockBalanceSchema.parse({ ...bal, uiAmount: null }).uiAmount).toBeNull();
  });
});
