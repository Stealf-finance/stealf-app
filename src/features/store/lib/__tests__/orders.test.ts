import { describe, it, expect } from 'vitest';
import {
  canRevealCode,
  isOrderSettled,
  isPaymentWindowOpen,
  newClientReference,
  orderOwesRefund,
  orderTransferAmount,
  paymentRefBytes,
  orderChargeDisplay,
} from '../orders';

describe('isOrderSettled', () => {
  it('settles on delivery, refund and expiry', () => {
    expect(isOrderSettled('delivered')).toBe(true);
    expect(isOrderSettled('refunded')).toBe(true);
    expect(isOrderSettled('expired')).toBe(true);
  });

  it('keeps a failed order open — a refund is still owed', () => {
    expect(isOrderSettled('failed')).toBe(false);
    expect(isOrderSettled('refunding')).toBe(false);
  });

  it('keeps every in-flight status open', () => {
    expect(isOrderSettled('creating')).toBe(false);
    expect(isOrderSettled('awaiting_payment')).toBe(false);
    expect(isOrderSettled('paid')).toBe(false);
    expect(isOrderSettled('submitted')).toBe(false);
  });
});

describe('orderOwesRefund', () => {
  it('owes on failure and while the refund is in flight', () => {
    expect(orderOwesRefund('failed')).toBe(true);
    expect(orderOwesRefund('refunding')).toBe(true);
  });

  it('owes nothing once refunded, or when the window closed unpaid', () => {
    expect(orderOwesRefund('refunded')).toBe(false);
    expect(orderOwesRefund('expired')).toBe(false);
  });
});

describe('canRevealCode', () => {
  it('reveals a failed order so delivered cards stay reachable', () => {
    expect(canRevealCode('failed')).toBe(true);
    expect(canRevealCode('delivered')).toBe(true);
    expect(canRevealCode('refunded')).toBe(true);
  });

  it('refuses anything still in flight', () => {
    expect(canRevealCode('paid')).toBe(false);
    expect(canRevealCode('submitted')).toBe(false);
    expect(canRevealCode('expired')).toBe(false);
  });
});

describe('orderTransferAmount', () => {
  it('reads the raw string exactly, where a float would drift', () => {
    expect(orderTransferAmount({ amountRaw: '24990000' })).toBe(24990000n);
    expect(BigInt(Math.round(24.99 * 1e6))).not.toBe(24989999n);
  });

  it('survives an amount past Number.MAX_SAFE_INTEGER', () => {
    expect(orderTransferAmount({ amountRaw: '9007199254740993' })).toBe(
      9007199254740993n,
    );
  });
});

describe('isPaymentWindowOpen', () => {
  const now = Date.parse('2026-09-02T14:00:00.000Z');

  it('is open before the deadline', () => {
    expect(isPaymentWindowOpen('2026-09-02T14:30:00.000Z', now)).toBe(true);
  });

  it('is closed after it', () => {
    expect(isPaymentWindowOpen('2026-09-02T13:30:00.000Z', now)).toBe(false);
  });

  it('fails open on an unparseable date rather than blocking the buyer', () => {
    expect(isPaymentWindowOpen('not-a-date', now)).toBe(true);
  });
});

describe('paymentRefBytes', () => {
  const ref = 'a3f1'.repeat(16);

  it('decodes 64 hex chars into exactly 32 bytes', () => {
    const bytes = paymentRefBytes({ paymentRef: ref });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
    expect(Array.from(bytes.slice(0, 2))).toEqual([0xa3, 0xf1]);
  });

  it('round-trips back to the same hex', () => {
    const bytes = paymentRefBytes({ paymentRef: ref });
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    expect(hex).toBe(ref);
  });

  it('refuses anything that is not 64 lowercase hex chars', () => {
    expect(() => paymentRefBytes({ paymentRef: 'a3f1' })).toThrow(
      /64 lowercase hex/,
    );
    expect(() => paymentRefBytes({ paymentRef: 'A3F1'.repeat(16) })).toThrow();
    expect(() => paymentRefBytes({ paymentRef: 'zz'.repeat(32) })).toThrow();
  });
});

describe('newClientReference', () => {
  it('does not repeat', () => {
    const seen = new Set(
      Array.from({ length: 200 }, () => newClientReference()),
    );
    expect(seen.size).toBe(200);
  });
});

describe('orderChargeDisplay', () => {
  it('reads base units back into USDC — 8880000 is 8.88, not 8 880 000', () => {
    expect(orderChargeDisplay({ amountRaw: '8880000' })).toBe(8.88);
  });

  it('holds USDC decimals whatever the local token metadata claims', () => {
    // The contract says `amountRaw` is USDC base units; a token entry that
    // disagrees is a metadata bug, and must not silently scale the display.
    expect(orderChargeDisplay({ amountRaw: '5000000' })).toBe(5);
  });
});
