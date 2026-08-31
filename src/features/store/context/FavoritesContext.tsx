/**
 * Favourited gift cards — in-memory, scoped to the Store stack, exactly like
 * the cart. Nothing is persisted yet: a favourite is a product id and would
 * survive a restart happily, but persistence is a deliberate later call
 * (see CartContext's note).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isFavorite, toggleFavorite } from '../lib/favorites';

type FavoritesApi = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesApi | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => toggleFavorite(prev, id));
  }, []);

  const value = useMemo<FavoritesApi>(
    () => ({ ids, has: (id) => isFavorite(ids, id), toggle }),
    [ids, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesApi {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside a FavoritesProvider');
  return ctx;
}
