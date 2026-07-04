/**
 * XstockRow — one tokenized-stock row in the list (logo, name, symbol, halted
 * pill). Design-system styling, matching the Grow card chrome.
 */
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mono } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import type { XstockAsset } from '../api/xstocks';

const S = txPalette('silver');

export function HaltedPill() {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(209,96,74,0.4)',
        backgroundColor: 'rgba(209,96,74,0.12)',
      }}
    >
      <Text
        style={[
          mono,
          {
            fontSize: 9,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: T.error,
          },
        ]}
      >
        Halted
      </Text>
    </View>
  );
}

export function XstockRow({
  asset,
  onPress,
}: {
  asset: XstockAsset;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 20 },
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 18,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* top sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        {asset.logo ? (
          <Image
            source={{ uri: asset.logo }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 16,
              color: S.ink,
              fontWeight: '500',
              letterSpacing: -0.16,
            }}
          >
            {asset.name}
          </Text>
          <Text
            style={[
              mono,
              {
                fontSize: 12,
                color: S.inkFaint,
                marginTop: 3,
                letterSpacing: 0.24,
              },
            ]}
          >
            {asset.symbol}
          </Text>
        </View>

        {asset.isTradingHalted && <HaltedPill />}
      </LinearGradient>
    </TouchableOpacity>
  );
}
