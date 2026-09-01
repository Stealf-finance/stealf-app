import { Stack } from 'expo-router';
import { T } from '@/src/design-system/tokens';
import { FavoritesProvider } from '@/src/features/store/context/FavoritesContext';

/** Favourites span the catalog and a product detail, and are dropped on exit. */
export default function StoreLayout() {
  return (
    <FavoritesProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: T.bg },
        }}
      />
    </FavoritesProvider>
  );
}
