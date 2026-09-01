import { useState } from 'react';
import { Image } from 'expo-image';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';
import {
  brandColors,
  brandIconUrl,
  isRemoteImage,
  monogram,
} from '../lib/brand';

type Props = {
  /** Seeds the tint — the product id, so a brand keeps its colour. */
  id: string;
  name: string;
  /** An absolute URL if one is ever supplied; otherwise derived from `id`. */
  uri?: string;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Product image when usable, tinted monogram otherwise — including on load failure. */
export function BrandMark({
  id,
  name,
  uri,
  size = 56,
  radius = 16,
  style,
}: Props) {
  const { bg, ink } = brandColors(id);
  // Keyed by id so a recycled row never inherits another brand's failure.
  const [failedId, setFailedId] = useState<string>();
  const source = isRemoteImage(uri) ? (uri as string) : brandIconUrl(id, size);
  const showImage = failedId !== id;

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
      {showImage ? (
        <Image
          source={{ uri: source }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setFailedId(id)}
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
