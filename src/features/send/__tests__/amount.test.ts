import { describe, expect, it } from 'vitest';
import {
  floorTo,
  hasFeeHeadroom,
  isFeeShort,
  maxSpendable,
  solBalanceOf,
  PRIVATE_OP_SOL_FEE_RESERVE,
  SOL_FEE_RESERVE,
} from '../lib/amount';

describe('floorTo', () => {
  it('rounds down rather than up', () => {
    expect(floorTo(12.345678, 4)).toBe(12.3456);
    expect(floorTo(0.99999, 2)).toBe(0.99);
  });

  it('treats float noise as exact', () => {
    // 0.1 + 0.2 lands at 0.30000000000000004; the cent is not lost.
    expect(floorTo(0.1 + 0.2, 2)).toBe(0.3);
    expect(floorTo(1.1 * 3, 2)).toBe(3.3);
  });

  it('floors nothing below zero', () => {
    expect(floorTo(-1, 4)).toBe(0);
    expect(floorTo(Number.NaN, 4)).toBe(0);
  });
});

describe('maxSpendable', () => {
  it('takes the reserve off a SOL amount', () => {
    expect(
      maxSpendable({ balance: 1.5, decimals: 9, spendsSol: true }),
    ).toBeCloseTo(1.5 - SOL_FEE_RESERVE, 9);
  });

  it('leaves a token balance whole — its fees come from SOL', () => {
    expect(
      maxSpendable({ balance: 12.345678, decimals: 6, spendsSol: false }),
    ).toBe(12.345678);
  });

  it('never returns more than the balance', () => {
    // The old toFixed(4) rounded 12.345678 up to 12.3457, above the balance.
    const max = maxSpendable({
      balance: 12.345678,
      decimals: 6,
      spendsSol: false,
    });
    expect(max).toBeLessThanOrEqual(12.345678);
  });

  it('bottoms out at zero when the reserve exceeds the balance', () => {
    expect(maxSpendable({ balance: 0.001, decimals: 9, spendsSol: true })).toBe(
      0,
    );
  });

  it('takes Umbra its protocol fee before the reserve', () => {
    const max = maxSpendable({
      balance: 1,
      decimals: 9,
      spendsSol: true,
      reserve: PRIVATE_OP_SOL_FEE_RESERVE,
      hasProtocolFee: true,
    });
    expect(max).toBeCloseTo(1 * 0.997 - 0.02, 6);
  });

  it('caps the precision it hands back', () => {
    const max = maxSpendable({
      balance: 1.123456789,
      decimals: 9,
      spendsSol: false,
    });
    expect(max).toBe(1.123456);
  });
});

describe('hasFeeHeadroom', () => {
  it('reads the same reserve as the headroom a token op needs', () => {
    expect(hasFeeHeadroom(0.01, SOL_FEE_RESERVE)).toBe(true);
    expect(hasFeeHeadroom(0.009, SOL_FEE_RESERVE)).toBe(false);
    expect(hasFeeHeadroom(0.01, PRIVATE_OP_SOL_FEE_RESERVE)).toBe(false);
  });
});

describe('solBalanceOf', () => {
  it('picks SOL out of the token list', () => {
    expect(
      solBalanceOf([
        { tokenSymbol: 'USDC', balance: 42 },
        { tokenSymbol: 'SOL', balance: 1.5 },
      ]),
    ).toBe(1.5);
  });

  it('reads an absent or unloaded balance as zero', () => {
    expect(solBalanceOf([{ tokenSymbol: 'USDC', balance: 42 }])).toBe(0);
    expect(solBalanceOf(undefined)).toBe(0);
  });
});

describe('isFeeShort', () => {
  it('holds its judgement while the balance is still loading', () => {
    expect(isFeeShort(undefined)).toBe(false);
  });

  it('blocks a wallet that cannot cover its own fees', () => {
    expect(isFeeShort([{ tokenSymbol: 'USDC', balance: 500 }])).toBe(true);
    expect(
      isFeeShort([
        { tokenSymbol: 'USDC', balance: 500 },
        { tokenSymbol: 'SOL', balance: 0.05 },
      ]),
    ).toBe(false);
  });

  it('asks more of an Umbra op', () => {
    const tokens = [{ tokenSymbol: 'SOL', balance: 0.015 }];
    expect(isFeeShort(tokens, SOL_FEE_RESERVE)).toBe(false);
    expect(isFeeShort(tokens, PRIVATE_OP_SOL_FEE_RESERVE)).toBe(true);
  });
});
