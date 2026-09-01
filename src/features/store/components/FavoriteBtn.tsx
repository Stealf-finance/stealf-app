import { Pressable } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { txPalette } from '@/src/design-system/palettes';
import { useFavorites } from '../context/FavoritesContext';

const S = txPalette('silver');

/** The heart on a gift-card. Sits inside the card's Pressable, so it stops
 *  the tap from reaching the card and opening the product. */
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
  const Icon = active ? Icons.heartFilled : Icons.heart;

  return (
    <Pressable
      onPress={() => toggle(productId)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        active ? `Remove ${name} from favourites` : `Add ${name} to favourites`
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <Icon size={size} color={active ? S.accent : S.inkFaint} />
    </Pressable>
  );
}
