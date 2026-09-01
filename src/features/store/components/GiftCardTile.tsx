import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { BrandMark } from './BrandMark';
import { FavoriteBtn } from './FavoriteBtn';
import { denominationSummary } from '../lib/format';
import type { StoreProduct } from '../lib/types';

const S = txPalette('silver');

/**
 * One card in a category grid — brand mark, favourite, name, denominations
 * and a Buy button. Buy opens the product rather than adding straight to the
 * cart: the denomination is the whole decision on a gift card, so it can't be
 * guessed on the user's behalf.
 */
export function GiftCardTile({
  product,
  onPress,
}: {
  product: StoreProduct;
  onPress: () => void;
}) {
  const disabled = !product.inStock;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${product.name} gift card`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: '47%',
        borderRadius: 20,
        padding: 14,
        backgroundColor: T.bgCard,
        opacity: disabled ? 0.42 : pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <BrandMark id={product.id} name={product.name} uri={product.image} size={44} radius={13} />
        <FavoriteBtn productId={product.id} name={product.name} />
      </View>

      <Text
        numberOfLines={1}
        style={[
          sansation,
          {
            marginTop: 12,
            fontSize: 15,
            fontWeight: '600',
            color: S.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {product.name}
      </Text>

      <Text
        numberOfLines={1}
        style={[sansation, { marginTop: 3, fontSize: 12, color: S.inkDim }]}
      >
        {disabled ? 'Out of stock' : denominationSummary(product)}
      </Text>

      <PillBtn
        label="Buy"
        compact
        disabled={disabled}
        onPress={onPress}
        accessibilityLabel={`Buy ${product.name}`}
        rightIcon={<Icons.arrRight size={14} color="#0a0a0a" />}
        style={{ marginTop: 14 }}
      />
    </Pressable>
  );
}
