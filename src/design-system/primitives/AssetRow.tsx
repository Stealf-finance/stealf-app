import { Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';

type Props = {
  iconSource: ImageSource | number | undefined;
  symbol: string;
  caption: string;
  priceLabel: string;
  ink: string;
  inkFaint: string;
  hairline: string;
};

/** A single asset/holding row: icon · symbol + caption · price. Tone-agnostic
 *  (caller passes the ink / inkFaint / hairline colors). */
export function AssetRow({
  iconSource,
  symbol,
  caption,
  priceLabel,
  ink,
  inkFaint,
  hairline,
}: Props) {
  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: hairline,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.04)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iconSource ? (
          <Image
            source={iconSource}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, color: ink }} numberOfLines={1}>
          {symbol}
        </Text>
        <Text style={{ fontSize: 11, color: inkFaint, marginTop: 2 }} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      <Text style={{ fontSize: 15, color: ink }} numberOfLines={1}>
        {priceLabel}
      </Text>
    </View>
  );
}
