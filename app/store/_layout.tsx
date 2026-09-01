import { Stack } from 'expo-router';
import { T } from '@/src/design-system/tokens';
import { CartProvider } from '@/src/features/store/context/CartContext';
import { FavoritesProvider } from '@/src/features/store/context/FavoritesContext';

/**
 * Store stack. The cart and favourites providers sit here rather than in the
 * root layout so they span the catalog and a product detail, and are dropped
 * when the user leaves the Store — neither holds anything worth persisting yet.
 */
export default function StoreLayout() {
  return (
    <FavoritesProvider>
      <CartProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: T.bg },
          }}
        />
      </CartProvider>
    </FavoritesProvider>
  );
}
