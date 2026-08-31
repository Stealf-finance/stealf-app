import { Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { GiftCardTile } from './GiftCardTile';
import { CATEGORY_LABELS } from '../lib/types';
import type { StoreCategory, StoreProduct } from '../lib/types';

const S = txPalette('silver');

/** A titled 2-column grid of gift cards. `title` overrides the category
 *  label — search results reuse this section without a category. */
export function CategorySection({
  category,
  title,
  products,
  onSelect,
}: {
  category?: StoreCategory;
  title?: string;
  products: StoreProduct[];
  onSelect: (product: StoreProduct) => void;
}) {
  if (products.length === 0) return null;
  const heading = title ?? (category ? CATEGORY_LABELS[category] : '');

  return (
    <View style={{ marginBottom: 28, paddingHorizontal: 20 }}>
      <Text
        style={[
          sansation,
          {
            fontSize: 18,
            lineHeight: 24,
            fontWeight: '600',
            letterSpacing: -0.2,
            color: S.ink,
            marginBottom: 12,
          },
        ]}
      >
        {heading}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {products.map((p) => (
          <GiftCardTile key={p.id} product={p} onPress={() => onSelect(p)} />
        ))}
      </View>
    </View>
  );
}
