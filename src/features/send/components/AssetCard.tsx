import { Pressable, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  iconSource: ImageSource | number;
  name: string;
  symbol: string;
  balanceLabel: string;
  maxLabel: string;
  onPressCard?: () => void;
  onPressMax: () => void;
};

export function AssetCard({
  iconSource,
  name,
  symbol,
  balanceLabel,
  maxLabel,
  onPressCard,
  onPressMax,
}: Props) {
  return (
    <View style={{ paddingHorizontal: 24 }}>
      <Pressable
        onPress={onPressCard}
        accessibilityRole={onPressCard ? 'button' : undefined}
        accessibilityLabel={onPressCard ? `Select asset, currently ${name}` : undefined}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingLeft: 12,
          paddingRight: 10,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: T.hairline,
          opacity: pressed && onPressCard ? 0.85 : 1,
        })}
      >
        <Image
          source={iconSource}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={{
            width: 36,
            height: 36,
          }}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text
              style={[
                sansation,
                { fontSize: 14, color: T.ink, fontWeight: '600' },
              ]}
            >
              {name}
            </Text>
            {onPressCard ? (
              <Icons.chevD size={12} color={T.inkDim} strokeWidth={2} />
            ) : null}
          </View>
          <Text
            style={[
              sansation,
              {
                fontSize: 11,
                color: T.inkFaint,
                marginTop: 2,
                letterSpacing: 0.2,
              },
            ]}
          >
            {balanceLabel} {symbol}
          </Text>
        </View>
        <Pressable
          onPress={onPressMax}
          accessibilityRole="button"
          accessibilityLabel={`Use max balance ${maxLabel} ${symbol}`}
          hitSlop={6}
          style={({ pressed }) => ({
            marginRight: 6,
            paddingVertical: 9,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.55)',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={[
              sansationBold,
              {
                fontSize: 11,
                color: T.ink,
                letterSpacing: 0.6,
              },
            ]}
          >
            Use Max
          </Text>
        </Pressable>
      </Pressable>
    </View>
  );
}
