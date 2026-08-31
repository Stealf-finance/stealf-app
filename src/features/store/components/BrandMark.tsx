import { Image } from 'expo-image';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';
import { brandColors, monogram } from '../lib/brand';

type Props = {
  /** Seeds the tint — the product id, so a brand keeps its colour. */
  id: string;
  name: string;
  /** Bitrefill's product image, once the catalog is live. */
  uri?: string;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A brand tile: the product image when there is one, a tinted monogram
 * otherwise. Bitrefill leaves `image` unset on a fair share of products, so
 * the monogram is a permanent fallback, not just scaffolding.
 */
export function BrandMark({ id, name, uri, size = 56, radius = 16, style }: Props) {
  const { bg, ink } = brandColors(id);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={150}
        />
      ) : (
        <Text
          style={[
            sansationBold,
            {
              fontSize: size * 0.36,
              color: ink,
              letterSpacing: 0.5,
              includeFontPadding: false,
            },
          ]}
        >
          {monogram(name)}
        </Text>
      )}
    </View>
  );
}
