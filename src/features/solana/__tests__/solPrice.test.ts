import { describe, expect, it } from 'vitest';
import { SolPriceSchema } from '../api/solPrice';

describe('SolPriceSchema', () => {
  it('parses the backend pricing payload', () => {
    const parsed = SolPriceSchema.parse({ price_usd: 142.35 });
    expect(parsed.price_usd).toBe(142.35);
  });

  it('rejects a missing or non-positive price', () => {
    expect(() => SolPriceSchema.parse({})).toThrow();
    expect(() => SolPriceSchema.parse({ price_usd: 0 })).toThrow();
    expect(() => SolPriceSchema.parse({ price_usd: -1 })).toThrow();
  });
});
