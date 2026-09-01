import { useState } from 'react';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { sansationBold } from '@/src/design-system/typography';
import {
  BRAND_ART_RATIO,
  brandArtUrl,
  brandColors,
  monogram,
} from '../lib/brand';

const RADIUS = 14;

/** 5:3 card artwork, monogram on failure. Explicit width — see STORE.md. */
export function BrandArt({
  id,
  name,
  width,
}: {
  id: string;
  name: string;
  width: number;
}) {
  const { bg, ink } = brandColors(id);
  const [failedId, setFailedId] = useState<string>();
  const height = Math.round(width / BRAND_ART_RATIO);

  return (
    <View
      style={{
        width,
        height,
        borderRadius: RADIUS,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {failedId === id ? (
        <Text
          style={[
            sansationBold,
            { fontSize: 30, color: ink, includeFontPadding: false },
          ]}
        >
          {monogram(name)}
        </Text>
      ) : (
        <Image
          source={{ uri: brandArtUrl(id, width) }}
          style={{ width, height }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setFailedId(id)}
        />
      )}
    </View>
  );
}
