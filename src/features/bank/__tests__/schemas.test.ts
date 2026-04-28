import { describe, it, expect } from 'vitest';
import { BalanceResponseSchema, TokenBalanceSchema } from '../api/balance';
import {
  HistoryResponseSchema,
  TransactionSchema,
} from '../api/history';

const SAMPLE_ADDRESS = '7pb2n3AqzY6QQfz7Q7gZ6J9wHuryu6tmcBu8fFPPT4U7';

describe('TokenBalanceSchema', () => {
  it('parses a SOL token with valid fields', () => {
    const raw = {
      tokenMint: null,
      tokenSymbol: 'SOL',
      tokenDecimals: 9,
      balance: 1.234,
      balanceUSD: 240.56,
    };
    const parsed = TokenBalanceSchema.parse(raw);
    expect(parsed.tokenSymbol).toBe('SOL');
    expect(parsed.tokenMint).toBeNull();
  });

  it('rejects when tokenSymbol is missing', () => {
    expect(() =>
      TokenBalanceSchema.parse({
        tokenMint: null,
        tokenDecimals: 9,
        balance: 0,
        balanceUSD: 0,
      }),
    ).toThrow();
  });
});

describe('BalanceResponseSchema', () => {
  it('parses an empty wallet', () => {
    const parsed = BalanceResponseSchema.parse({
      address: SAMPLE_ADDRESS,
      tokens: [],
      totalUSD: 0,
    });
    expect(parsed.tokens).toEqual([]);
    expect(parsed.totalUSD).toBe(0);
  });

  it('rejects when totalUSD is a string', () => {
    expect(() =>
      BalanceResponseSchema.parse({
        address: SAMPLE_ADDRESS,
        tokens: [],
        totalUSD: '0',
      }),
    ).toThrow();
  });
});

describe('TransactionSchema', () => {
  const sample = {
    signature: 'sig123',
    amount: 0.5,
    amountUSD: 100,
    tokenMint: null,
    tokenSymbol: 'SOL',
    tokenDecimals: 9,
    signatureURL: 'https://solscan.io/tx/sig123',
    walletAddress: SAMPLE_ADDRESS,
    dateFormatted: '21 Apr · 04:41 am',
    status: 'confirmed',
    type: 'received' as const,
    slot: 123456,
  };

  it('parses a received SOL tx', () => {
    expect(TransactionSchema.parse(sample).type).toBe('received');
  });

  it('rejects unknown tx type', () => {
    expect(() =>
      TransactionSchema.parse({ ...sample, type: 'staking' }),
    ).toThrow();
  });
});

describe('HistoryResponseSchema', () => {
  it('parses an empty history', () => {
    const parsed = HistoryResponseSchema.parse({
      address: SAMPLE_ADDRESS,
      count: 0,
      transactions: [],
    });
    expect(parsed.count).toBe(0);
  });
});
