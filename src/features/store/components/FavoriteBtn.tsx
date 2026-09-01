import { Pressable } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useFavorites } from '../context/FavoritesContext';

const S = txPalette('silver');

/** Saves a card for later. Sits inside the tile's Pressable and swallows the tap. */
export function FavoriteBtn({
  productId,
  name,
  size = 18,
}: {
  productId: string;
  name: string;
  size?: number;
}) {
  const { has, toggle } = useFavorites();
  const active = has(productId);

  return (
    <Pressable
      onPress={() => toggle(productId)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        active ? `Remove ${name} from saved` : `Save ${name} for later`
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <Icons.cart size={size} color={active ? T.favorite : S.ink} />
    </Pressable>
  );
}
