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
  it('parses detail with a nullable reference price + status', () => {
    const detail = {
      ...asset,
      referencePrice: null,
      multiplier: 1,
      status: {
        symbol: 'AAPLx',
        isMarketTradingHalted: false,
        isAtomicTradingHalted: false,
      },
    };
    expect(XstockDetailSchema.parse(detail).referencePrice).toBeNull();
    expect(XstockDetailSchema.parse({ ...detail, referencePrice: 227.3 }).referencePrice).toBe(227.3);
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
