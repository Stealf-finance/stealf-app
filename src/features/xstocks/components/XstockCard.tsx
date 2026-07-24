/**
 * A single xStock in the Earn "Available products" list. App card chrome
 * (BlurGlass) — remote logo + name + symbol, with a "Halted" pill when trading
 * is paused. Non-interactive for now; the detail screen + tap wiring land in a
 * later slice.
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import type { SolanaXstock } from '../api/assets';

const S = txPalette('silver');

export function XstockCard({ asset }: { asset: SolanaXstock }) {
  return (
    <BlurGlass radius={22} innerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Image
          source={{ uri: asset.logo }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={[sansation, { fontSize: 16, fontWeight: '600', color: S.ink }]}
          >
            {asset.name}
          </Text>
          <Text style={[sansation, { fontSize: 13, color: S.inkDim, marginTop: 2 }]}>
            {asset.symbol}
          </Text>
        </View>
        {asset.isTradingHalted ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(209,96,74,0.14)',
            }}
          >
            <Text style={[sansation, { fontSize: 11, fontWeight: '600', color: T.error }]}>
              Halted
            </Text>
          </View>
        ) : null}
      </View>
    </BlurGlass>
  );
}
