import { USDC_DECIMALS } from '@/src/constants/solana';
import type { StoreOrderStatus } from '../api/orders';

/** Nothing more will happen. `failed` is absent: it still owes a refund. */
export function isOrderSettled(status: StoreOrderStatus): boolean {
  return (
    status === 'delivered' || status === 'refunded' || status === 'expired'
  );
}

/** We hold the user's money and owe it back — never render this as a dead order. */
export function orderOwesRefund(status: StoreOrderStatus): boolean {
  return status === 'failed' || status === 'refunding';
}

/** `failed` reveals on purpose: an order can deliver some cards and fail others. */
export function canRevealCode(status: StoreOrderStatus): boolean {
  return status === 'delivered' || status === 'failed' || status === 'refunded';
}

/** The only correct source for the transfer amount. See STORE.md. */
export function orderTransferAmount(order: { amountRaw: string }): bigint {
  return BigInt(order.amountRaw);
}

/**
 * What to show the user. `amountRaw` is defined by the response contract as
 * USDC base units, so it is read back with USDC's decimals — never with the
 * resolved token's, which is local metadata and has been wrong before.
 * `amountUsdc` is optional on the response; `amountRaw` never is.
 */
export function orderChargeDisplay(order: { amountRaw: string }): number {
  return Number(orderTransferAmount(order)) / 10 ** USDC_DECIMALS;
}

/** Fails open: the backend still credits a payment against an expired order. */
export function isPaymentWindowOpen(expiresAt: string, now: number): boolean {
  const deadline = Date.parse(expiresAt);
  return Number.isNaN(deadline) ? true : deadline > now;
}

/** The schema pins 64 lowercase hex chars, so this cannot be short-changed. */
export function paymentRefBytes(order: { paymentRef: string }): Uint8Array {
  const hex = order.paymentRef;
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error(`paymentRef must be 64 lowercase hex chars, got "${hex}"`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function randomChunk(): string {
  const source = globalThis.crypto;
  if (source?.getRandomValues) {
    const bytes = source.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

/** Idempotency key: reuse it on retry, mint a fresh one after a 409. */
export function newClientReference(): string {
  return `stealf-${Date.now().toString(36)}-${randomChunk()}`;
}
