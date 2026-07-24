/**
 * One xStock row inside the "Tokenized Stocks" group card: logo + name on the
 * left, live reference price on the right ("Halted" underneath when trading is
 * paused). Price comes from the per-asset detail endpoint.
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import type { SolanaXstock } from '../api/assets';
import { useXstockAsset } from '../hooks/useXstockAsset';

const S = txPalette('silver');

function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function XstockRow({ asset }: { asset: SolanaXstock }) {
  const { data: detail } = useXstockAsset(asset.symbol);
  const price = detail?.referencePrice;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
      <Image
        source={{ uri: asset.logo }}
        style={{ width: 38, height: 38, borderRadius: 19 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[sansation, { fontSize: 16, color: S.ink }]}>
          {asset.name}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[sansation, { fontSize: 16, fontWeight: '600', color: S.ink }]}>
          {price != null ? formatUsd(price) : '—'}
        </Text>
        {asset.isTradingHalted ? (
          <Text
            style={[sansation, { fontSize: 11, fontWeight: '600', color: T.error, marginTop: 2 }]}
          >
            Halted
          </Text>
        ) : null}
      </View>
    </View>
  );
}
