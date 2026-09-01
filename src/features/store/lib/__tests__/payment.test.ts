import { describe, expect, it } from 'vitest';
import {
  DEV_SOL_TEST_AMOUNT,
  isNativeTestToken,
  paymentAmountRaw,
  paymentHumanAmount,
  resolvePaymentBlocker,
  resolvePaymentToken,
  type PaymentToken,
} from '../payment';

const token = (symbol: string, amountRaw: bigint): PaymentToken => ({
  mint: `mint-${symbol}`,
  symbol,
  decimals: 6,
  amountRaw,
});

describe('resolvePaymentToken', () => {
  it('prefers USDC over every other settlement symbol', () => {
    const found = resolvePaymentToken([
      token('dUSDT', 1n),
      token('dUSDC', 1n),
      token('USDC', 1n),
    ]);
    expect(found?.symbol).toBe('USDC');
  });

  it('falls back to the devnet mint when USDC is absent', () => {
    expect(
      resolvePaymentToken([token('SOL', 1n), token('dUSDC', 1n)])?.symbol,
    ).toBe('dUSDC');
  });

  it('ignores SOL unless the native fallback is allowed', () => {
    const held = [token('SOL', 5n)];
    expect(resolvePaymentToken(held)).toBeUndefined();
    expect(resolvePaymentToken(held, { allowNative: true })?.symbol).toBe(
      'SOL',
    );
  });

  it('still prefers a stablecoin over SOL when both are held', () => {
    const held = [token('SOL', 5n), token('dUSDC', 5n)];
    expect(resolvePaymentToken(held, { allowNative: true })?.symbol).toBe(
      'dUSDC',
    );
  });

  it('returns undefined when the wallet holds no settlement token', () => {
    expect(resolvePaymentToken([token('SOL', 1n)])).toBeUndefined();
    expect(resolvePaymentToken(undefined)).toBeUndefined();
  });
});

describe('paymentAmountRaw', () => {
  it('charges the unit price, not the face value', () => {
    const amount = { packageId: 'p', value: 50, unitPrice: 48.5 };
    expect(paymentAmountRaw(amount, token('USDC', 0n))).toBe(48_500_000n);
  });

  it('scales to the token decimals', () => {
    const amount = { value: 25, unitPrice: 25 };
    expect(paymentAmountRaw(amount, token('USDC', 0n))).toBe(25_000_000n);
    expect(
      paymentAmountRaw(amount, { ...token('dUSDT', 0n), decimals: 9 }),
    ).toBe(25_000_000_000n);
  });

  it('charges the flat dev amount in SOL, never the card price', () => {
    const amount = { value: 25, unitPrice: 25 };
    const sol = { ...token('SOL', 0n), decimals: 9 };
    expect(paymentAmountRaw(amount, sol)).toBe(1_000_000n);
    expect(paymentHumanAmount(amount, sol)).toBe(DEV_SOL_TEST_AMOUNT);
  });

  it('does not let the card price leak into the SOL path', () => {
    const cheap = { value: 5, unitPrice: 5 };
    const dear = { value: 1000, unitPrice: 1000 };
    const sol = { ...token('SOL', 0n), decimals: 9 };
    expect(paymentAmountRaw(cheap, sol)).toBe(paymentAmountRaw(dear, sol));
  });
});

describe('isNativeTestToken', () => {
  it('flags SOL and nothing else', () => {
    expect(isNativeTestToken(token('SOL', 0n))).toBe(true);
    expect(isNativeTestToken(token('USDC', 0n))).toBe(false);
    expect(isNativeTestToken(token('dUSDC', 0n))).toBe(false);
  });
});

describe('resolvePaymentBlocker', () => {
  const ok = {
    signerReady: true,
    inStock: true,
    token: token('USDC', 100_000_000n),
    requiredRaw: 25_000_000n,
    publicSol: 1,
  };

  it('clears a fully funded, in-stock purchase', () => {
    expect(resolvePaymentBlocker(ok)).toBeNull();
  });

  it('blocks before Turnkey has hydrated', () => {
    expect(resolvePaymentBlocker({ ...ok, signerReady: false })).toBe('signer');
  });

  it('blocks an out-of-stock card', () => {
    expect(resolvePaymentBlocker({ ...ok, inStock: false })).toBe('stock');
  });

  it('blocks when no settlement token is held', () => {
    expect(resolvePaymentBlocker({ ...ok, token: undefined })).toBe('token');
    expect(resolvePaymentBlocker({ ...ok, requiredRaw: undefined })).toBe(
      'token',
    );
  });

  it('blocks on an encrypted balance one unit short', () => {
    const short = { ...ok, token: token('USDC', 24_999_999n) };
    expect(resolvePaymentBlocker(short)).toBe('balance');
  });

  it('allows an exactly-sufficient balance', () => {
    expect(
      resolvePaymentBlocker({ ...ok, token: token('USDC', 25_000_000n) }),
    ).toBeNull();
  });

  it('blocks when public SOL cannot cover the MPC fees', () => {
    expect(resolvePaymentBlocker({ ...ok, publicSol: 0.001 })).toBe('fee');
  });

  it('reports the earliest blocker when several apply', () => {
    expect(
      resolvePaymentBlocker({
        ...ok,
        signerReady: false,
        inStock: false,
        publicSol: 0,
      }),
    ).toBe('signer');
  });
});
