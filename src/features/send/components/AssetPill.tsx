import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';

export type Asset = {
  symbol: string;
  name: string;
  balance: string;
  fiat?: string;
  gradient: [string, string];
  /** When set, rendered inside the 44px disc instead of the gradient. */
  iconSource?: ImageSourcePropType;
  /** Per-unit USD price, used to convert the typed amount to fiat in real time. */
  priceUSD?: number;
};

type Props = Asset & {
  tone?: Tone;
  onPress?: () => void;
};

export function AssetPill({
  symbol,
  name,
  balance,
  fiat,
  gradient,
  iconSource,
  tone = 'silver',
  onPress,
}: Props) {
  const palette = txPalette(tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Send ${name}`}
      style={{
        width: '100%',
        marginBottom: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.hairline,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {iconSource ? (
          <Image
            source={iconSource}
            resizeMode="contain"
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
        ) : (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
            }}
          />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, color: palette.ink }}>{name}</Text>
          <Text
            style={{
              fontSize: 12,
              color: palette.inkFaint,
              marginTop: 3,
            }}
          >
            {balance} {symbol}
          </Text>
        </View>
        {fiat ? (
          <Text
            style={[
              serif,
              {
                fontSize: 13,
                color: palette.inkDim,
                fontStyle: 'italic',
              },
            ]}
          >
            {fiat}
          </Text>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}
