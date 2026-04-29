import { describe, expect, it } from 'vitest';
import { CoinGeckoSolPriceSchema } from '../api/solPrice';

describe('CoinGeckoSolPriceSchema', () => {
  it('parses a valid CoinGecko response', () => {
    const raw = { solana: { usd: 213.45 } };
    const parsed = CoinGeckoSolPriceSchema.parse(raw);
    expect(parsed.solana.usd).toBe(213.45);
  });

  it('rejects responses with non-finite price', () => {
    const raw = { solana: { usd: Number.NaN } };
    expect(() => CoinGeckoSolPriceSchema.parse(raw)).toThrow();
  });

  it('rejects responses missing the solana key', () => {
    const raw = { ethereum: { usd: 1234 } };
    expect(() => CoinGeckoSolPriceSchema.parse(raw)).toThrow();
  });
});
