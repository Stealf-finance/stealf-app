import { describe, expect, it } from 'vitest';
import {
  devNativeAmountRaw,
  estimatedAmountRaw,
  isNativeTestToken,
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
  it('prefers USDC over the devnet mint', () => {
    const found = resolvePaymentToken([token('dUSDC', 1n), token('USDC', 1n)]);
    expect(found?.symbol).toBe('USDC');
  });

  it('falls back to the devnet mint when USDC is absent', () => {
    expect(resolvePaymentToken([token('dUSDC', 1n)])?.symbol).toBe('dUSDC');
  });

  it('refuses USDT — the backend only ever credits its USDC account', () => {
    expect(resolvePaymentToken([token('USDT', 5n), token('dUSDT', 5n)])).toBeUndefined();
  });

  it('returns undefined when the wallet holds no settlement token', () => {
    expect(resolvePaymentToken([])).toBeUndefined();
    expect(resolvePaymentToken(undefined)).toBeUndefined();
  });
});

describe('estimatedAmountRaw', () => {
  it('uses the unit price, not the face value', () => {
    const amount = { packageId: 'p', value: 50, unitPrice: 48.5 };
    expect(estimatedAmountRaw(amount, token('USDC', 0n))).toBe(48_500_000n);
  });

  it('scales to the token decimals', () => {
    const amount = { value: 25, unitPrice: 25 };
    expect(estimatedAmountRaw(amount, token('USDC', 0n))).toBe(25_000_000n);
    expect(
      estimatedAmountRaw(amount, { ...token('dUSDC', 0n), decimals: 9 }),
    ).toBe(25_000_000_000n);
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

describe('the dev SOL fallback', () => {
  const sol = { ...token('SOL', 0n), decimals: 9 };

  it('is ignored unless explicitly allowed', () => {
    expect(resolvePaymentToken([sol])).toBeUndefined();
    expect(resolvePaymentToken([sol], { allowNative: true })?.symbol).toBe('SOL');
  });

  it('still prefers a stablecoin when both are held', () => {
    expect(
      resolvePaymentToken([sol, token('dUSDC', 5n)], { allowNative: true })?.symbol,
    ).toBe('dUSDC');
  });

  it('sends a flat amount, never the card price', () => {
    const flat = devNativeAmountRaw(sol);
    expect(estimatedAmountRaw({ value: 1000, unitPrice: 1000 }, sol)).toBe(flat);
    expect(estimatedAmountRaw({ value: 5, unitPrice: 5 }, sol)).toBe(flat);
  });

  it('scales the flat amount to the token decimals', () => {
    expect(devNativeAmountRaw({ ...sol, decimals: 6 }) * 1000n).toBe(
      devNativeAmountRaw(sol),
    );
  });

  it('flags SOL and nothing else', () => {
    expect(isNativeTestToken(sol)).toBe(true);
    expect(isNativeTestToken(token('dUSDC', 0n))).toBe(false);
  });
});
