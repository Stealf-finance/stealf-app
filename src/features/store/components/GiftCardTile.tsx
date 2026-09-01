import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { BRAND_ART_RATIO } from '../lib/brand';
import { denominationSummary } from '../lib/format';
import { tileWidth } from '../lib/grid';
import { shortProductName } from '../lib/productName';
import { BrandArt } from './BrandArt';
import { FavoriteBtn } from './FavoriteBtn';
import type { StoreProduct } from '../api/curated';

const S = txPalette('silver');

/** Artwork, name, denominations. Tapping opens the product — see STORE.md. */
export function GiftCardTile({
  product,
  onPress,
}: {
  product: StoreProduct;
  onPress: () => void;
}) {
  const { width: screen } = useWindowDimensions();
  const width = tileWidth(screen);
  const disabled = !product.inStock;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${product.name} gift card`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        width,
        opacity: disabled ? 0.42 : pressed ? 0.7 : 1,
      })}
    >
      <View>
        <BrandArt id={product.id} name={product.name} width={width} />
        {/* Scrim: a red heart vanishes on pink or red artwork. */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        >
          <FavoriteBtn productId={product.id} name={product.name} />
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={[
          sansation,
          {
            width,
            marginTop: 10,
            fontSize: 15,
            fontWeight: '600',
            color: S.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {shortProductName(product.name)}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          sansation,
          { width, marginTop: 3, fontSize: 13, color: S.inkDim },
        ]}
      >
        {disabled ? 'Out of stock' : denominationSummary(product)}
      </Text>
    </Pressable>
  );
}

/** Holds a tile's shape while the catalog loads. */
export function GiftCardTileSkeleton() {
  const { width: screen } = useWindowDimensions();
  const width = tileWidth(screen);

  return (
    <View style={{ width }}>
      <Skeleton
        width={width}
        height={Math.round(width / BRAND_ART_RATIO)}
        radius={14}
      />
      <View style={{ marginTop: 10 }}>
        <Skeleton width="70%" height={15} radius={5} />
      </View>
      <View style={{ marginTop: 4 }}>
        <Skeleton width="52%" height={13} radius={4} />
      </View>
    </View>
  );
}
