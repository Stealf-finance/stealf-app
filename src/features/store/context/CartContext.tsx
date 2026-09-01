/**
 * Store cart — in-memory, scoped to the Store stack.
 *
 * Mounted by `app/store/_layout.tsx`, so the cart survives navigation between
 * the catalog and a product detail and is dropped when the user leaves the
 * Store. Deliberately NOT persisted: nothing can be bought yet, and a cart
 * that outlives the session would need catalog/price revalidation on rehydrate.
 *
 * All arithmetic lives in `../lib/cart` (pure, unit-tested); this file is only
 * the React binding.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addLine,
  cartCount,
  cartTotal,
  removeLine,
  setQuantity,
} from '../lib/cart';
import { STORE_CURRENCY } from '../lib/catalog';
import type { CartLine } from '../lib/types';

type CartApi = {
  lines: CartLine[];
  /** Total cards, not total lines — this is what the header badge shows. */
  count: number;
  total: number;
  currency: string;
  add: (line: CartLine) => void;
  remove: (key: string) => void;
  setQty: (key: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => addLine(prev, line));
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => removeLine(prev, key));
  }, []);

  const setQty = useCallback((key: string, quantity: number) => {
    setLines((prev) => setQuantity(prev, key, quantity));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      count: cartCount(lines),
      total: cartTotal(lines),
      // One market, one currency (see STORE_COUNTRY). Revisit if the Store
      // ever spans countries.
      currency: lines[0]?.currency ?? STORE_CURRENCY,
      add,
      remove,
      setQty,
      clear,
    }),
    [lines, add, remove, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside a CartProvider');
  return ctx;
}
