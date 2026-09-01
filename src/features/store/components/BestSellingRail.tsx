import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { BrandMark } from './BrandMark';
import { FavoriteBtn } from './FavoriteBtn';
import { formatMoney, packageValue } from '../lib/format';
import type { StoreProduct } from '../lib/types';

const S = txPalette('silver');
const CARD_WIDTH = 158;

/** Cheapest denomination — the "From €15" line on a rail card. */
function fromLabel(product: StoreProduct): string {
  if (product.packages.length > 0) {
    const lowest = Math.min(...product.packages.map(packageValue));
    return `From ${formatMoney(lowest, product.currency)}`;
  }
  const min = product.range?.min;
  return min != null ? `From ${formatMoney(min, product.currency)}` : 'Any amount';
}

function RailCard({
  product,
  onPress,
}: {
  product: StoreProduct;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.name} gift card`}
      style={({ pressed }) => ({
        width: CARD_WIDTH,
        borderRadius: 22,
        padding: 16,
        backgroundColor: T.bgCardStrong,
        borderWidth: 1,
        borderColor: T.hairline,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <BrandMark id={product.id} name={product.name} uri={product.image} size={52} radius={15} />
        <FavoriteBtn productId={product.id} name={product.name} />
      </View>

      <Text
        numberOfLines={1}
        style={[
          sansation,
          {
            marginTop: 14,
            fontSize: 15,
            fontWeight: '600',
            color: S.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {product.name}
      </Text>

      <Text style={[sansation, { marginTop: 2, fontSize: 12, color: S.inkDim }]}>
        {fromLabel(product)}
      </Text>

      <PillBtn
        label="Buy"
        compact
        onPress={onPress}
        accessibilityLabel={`Buy ${product.name}`}
        rightIcon={<Icons.arrRight size={14} color="#0a0a0a" />}
        style={{ marginTop: 14 }}
      />
    </Pressable>
  );
}

/**
 * The "Best Selling" rail. Curated, not ranked — Bitrefill exposes no
 * popularity signal (see ../lib/featured). Renders nothing when the curated
 * list resolves to nothing, so a filtered catalog never leaves a bare heading.
 */
export function BestSellingRail({
  products,
  onSelect,
}: {
  products: StoreProduct[];
  onSelect: (product: StoreProduct) => void;
}) {
  if (products.length === 0) return null;

  return (
    <View style={{ marginBottom: 28 }}>
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
            paddingHorizontal: 20,
          },
        ]}
      >
        Best Selling
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
      >
        {products.map((p) => (
          <RailCard key={p.id} product={p} onPress={() => onSelect(p)} />
        ))}
      </ScrollView>
    </View>
  );
}
