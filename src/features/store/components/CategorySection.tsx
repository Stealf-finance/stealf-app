import { Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { GiftCardTile } from './GiftCardTile';
import { GRID_GAP, GRID_GUTTER, rowsOfTwo } from '../lib/grid';
import { GROUP_LABELS } from '../lib/types';
import type { StoreGroup, StoreProduct } from '../api/curated';

const S = txPalette('silver');

/** `title` overrides the group label — search results reuse this section. */
export function CategorySection({
  group,
  title,
  products,
  onSelect,
}: {
  group?: StoreGroup;
  title?: string;
  products: StoreProduct[];
  onSelect: (product: StoreProduct) => void;
}) {
  if (products.length === 0) return null;
  const heading = title ?? (group ? GROUP_LABELS[group] : '');
  const rows = rowsOfTwo(products);

  return (
    <View style={{ marginBottom: 28, paddingHorizontal: GRID_GUTTER }}>
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

      <View style={{ gap: 20 }}>
        {rows.map((row) => (
          <View key={row[0].id} style={{ flexDirection: 'row', gap: GRID_GAP }}>
            {row.map((p) => (
              <GiftCardTile
                key={p.id}
                product={p}
                onPress={() => onSelect(p)}
              />
            ))}
            {/* Keeps a lone trailing tile half-width instead of stretching. */}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}
