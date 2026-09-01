import { describe, it, expect } from 'vitest';
import {
  MAX_QUANTITY,
  addLine,
  cartCount,
  cartTotal,
  lineKey,
  removeLine,
  setQuantity,
} from '../cart';
import type { CartLine } from '../types';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 'amazon-fr',
  name: 'Amazon',
  currency: 'EUR',
  packageId: 'amazon-fr<&>25',
  value: 25,
  unitPrice: 25,
  quantity: 1,
  ...over,
});

describe('lineKey', () => {
  it('is identical for the same product at the same denomination', () => {
    expect(lineKey(line())).toBe(lineKey(line({ name: 'Amazon.fr' })));
  });

  it('differs across denominations of one product', () => {
    const a = lineKey(line({ packageId: 'amazon-fr<&>25', value: 25 }));
    const b = lineKey(line({ packageId: 'amazon-fr<&>50', value: 50 }));
    expect(a).not.toBe(b);
  });

  it('separates ranged amounts by value when there is no packageId', () => {
    const a = lineKey(line({ packageId: undefined, value: 30 }));
    const b = lineKey(line({ packageId: undefined, value: 40 }));
    expect(a).not.toBe(b);
  });
});

describe('addLine', () => {
  it('appends a line the cart does not hold yet', () => {
    const out = addLine([], line());
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(1);
  });

  it('merges quantities instead of duplicating the same denomination', () => {
    const out = addLine([line({ quantity: 2 })], line({ quantity: 3 }));
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(5);
  });

  it('keeps distinct denominations of one product apart', () => {
    const out = addLine(
      [line()],
      line({ packageId: 'amazon-fr<&>50', value: 50, unitPrice: 50 }),
    );
    expect(out).toHaveLength(2);
  });

  it('clamps a merge at the quantity the backend accepts', () => {
    const out = addLine([line({ quantity: MAX_QUANTITY })], line({ quantity: 5 }));
    expect(out[0].quantity).toBe(MAX_QUANTITY);
  });

  it('does not mutate the array it was given', () => {
    const before = [line()];
    addLine(before, line({ packageId: 'x', value: 10 }));
    expect(before).toHaveLength(1);
  });
});

describe('setQuantity', () => {
  it('replaces the quantity of the addressed line', () => {
    const lines = [line()];
    const out = setQuantity(lines, lineKey(lines[0]), 4);
    expect(out[0].quantity).toBe(4);
  });

  it('drops the line when the quantity falls to zero', () => {
    const lines = [line()];
    expect(setQuantity(lines, lineKey(lines[0]), 0)).toHaveLength(0);
  });

  it('leaves the cart alone for an unknown key', () => {
    const lines = [line()];
    expect(setQuantity(lines, 'nope', 9)).toEqual(lines);
  });
});

describe('removeLine', () => {
  it('removes only the addressed line', () => {
    const a = line();
    const b = line({ packageId: 'amazon-fr<&>50', value: 50 });
    const out = removeLine([a, b], lineKey(a));
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(50);
  });
});

describe('cartCount', () => {
  it('sums quantities rather than counting lines', () => {
    expect(cartCount([line({ quantity: 2 }), line({ packageId: 'b', quantity: 3 })])).toBe(5);
  });

  it('is zero for an empty cart', () => {
    expect(cartCount([])).toBe(0);
  });
});

describe('cartTotal', () => {
  it('multiplies each unit price by its quantity', () => {
    const out = cartTotal([
      line({ unitPrice: 25, quantity: 2 }),
      line({ packageId: 'b', unitPrice: 50, quantity: 1 }),
    ]);
    expect(out).toBe(100);
  });

  it('avoids float drift on prices with cents', () => {
    expect(cartTotal([line({ unitPrice: 10.1, quantity: 3 })])).toBe(30.3);
  });
});
