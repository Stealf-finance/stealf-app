import { describe, expect, it } from 'vitest';
import { describeClaimLine, shortAddress } from '../describeClaimLine';

const SENDER = 'Bc9kAbcdEfghIjklMnopQrstUvwxyz12f81a';

describe('shortAddress', () => {
  it('truncates a long address', () => {
    expect(shortAddress(SENDER)).toBe('Bc9k…f81a');
  });
  it('passes through short/empty values', () => {
    expect(shortAddress('abc')).toBe('abc');
    expect(shortAddress(null)).toBeNull();
  });
});

describe('describeClaimLine', () => {
  const dusdc = { symbol: 'dUSDC', decimals: 6, usdPerUnit: 1 };

  it('concatenates sender + USD value + token for a stablecoin', () => {
    expect(
      describeClaimLine({ sender: SENDER, token: dusdc, amountRaw: 12_500_000n }),
    ).toBe('Bc9k…f81a · $12.50 dUSDC');
  });

  it('computes USD from a live price for SOL', () => {
    expect(
      describeClaimLine({
        sender: SENDER,
        token: { symbol: 'SOL', decimals: 9, usdPerUnit: 150 },
        amountRaw: 1_500_000_000n,
      }),
    ).toBe('Bc9k…f81a · $225.00 SOL');
  });

  it('shows the raw token amount when USD value is unknown', () => {
    expect(
      describeClaimLine({
        sender: SENDER,
        token: { symbol: 'SOL', decimals: 9, usdPerUnit: null },
        amountRaw: 1_500_000_000n,
      }),
    ).toBe('Bc9k…f81a · 1.5 SOL');
  });

  it('omits the value part when the token is unknown', () => {
    expect(
      describeClaimLine({ sender: SENDER, token: null, amountRaw: 100n }),
    ).toBe('Bc9k…f81a');
  });

  it('falls back to "Private transfer" when nothing resolves', () => {
    expect(
      describeClaimLine({ sender: null, token: null, amountRaw: null }),
    ).toBe('Private transfer');
  });

  it('still shows the symbol when amount is missing', () => {
    expect(
      describeClaimLine({ sender: null, token: dusdc, amountRaw: null }),
    ).toBe('dUSDC');
  });
});
