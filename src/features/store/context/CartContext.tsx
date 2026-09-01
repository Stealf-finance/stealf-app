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
      // Per-product currency; see STORE.md on mixed-currency totals.
      currency: lines[0]?.currency ?? '',
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
