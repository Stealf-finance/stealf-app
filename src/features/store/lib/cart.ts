/**
 * Cart arithmetic — pure, so it is testable under Vitest's node env.
 *
 * The cart is client-side only: the backend creates ONE order per product
 * line (`POST /api/giftcards/orders` takes a single `productId`), so checkout
 * will eventually walk these lines. Nothing here talks to the network.
 */
import type { CartLine } from './types';

/** The backend caps a single order at 20 (`createOrderSchema.quantity`). */
export const MAX_QUANTITY = 20;

/**
 * Identity of a cart line: the same product AND the same denomination. Two
 * €25 Amazon cards merge into one line of 2; a €25 and a €50 stay apart.
 * Ranged products have no packageId, so their value carries the identity.
 */
export function lineKey(
  line: Pick<CartLine, 'productId' | 'packageId' | 'value'>,
): string {
  return `${line.productId}::${line.packageId ?? `custom-${line.value}`}`;
}

const clampQuantity = (n: number): number =>
  Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(n)));

/** Adds a line, merging into an existing one at the same denomination. */
export function addLine(
  lines: readonly CartLine[],
  incoming: CartLine,
): CartLine[] {
  const key = lineKey(incoming);
  const existing = lines.find((l) => lineKey(l) === key);
  if (!existing) {
    return [...lines, { ...incoming, quantity: clampQuantity(incoming.quantity) }];
  }
  return lines.map((l) =>
    lineKey(l) === key
      ? { ...l, quantity: clampQuantity(l.quantity + incoming.quantity) }
      : l,
  );
}

/** Sets one line's quantity. A quantity at or below zero drops the line. */
export function setQuantity(
  lines: readonly CartLine[],
  key: string,
  quantity: number,
): CartLine[] {
  if (quantity <= 0) return removeLine(lines, key);
  return lines.map((l) =>
    lineKey(l) === key ? { ...l, quantity: clampQuantity(quantity) } : l,
  );
}

export function removeLine(
  lines: readonly CartLine[],
  key: string,
): CartLine[] {
  return lines.filter((l) => lineKey(l) !== key);
}

/** Total number of cards — what the header badge shows. */
export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/**
 * Cart total. Summed in integer cents: prices carry decimals, and
 * `10.1 * 3` in floating point is 30.299999999999997.
 */
export function cartTotal(lines: readonly CartLine[]): number {
  const cents = lines.reduce(
    (sum, l) => sum + Math.round(l.unitPrice * 100) * l.quantity,
    0,
  );
  return cents / 100;
}
