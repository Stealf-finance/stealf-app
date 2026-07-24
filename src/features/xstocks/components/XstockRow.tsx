import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
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
  const change = detail?.priceChange24h;

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
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        {price != null ? (
          <Text style={[sansation, { fontSize: 16, fontWeight: '600', color: S.ink }]}>
            {formatUsd(price)}
          </Text>
        ) : (
          // Shimmer while the price loads instead of a dead dash.
          <Skeleton width={64} height={15} radius={5} />
        )}
        {change != null ? (
          <Text
            style={[
              sansation,
              { fontSize: 12, fontWeight: '600', color: change >= 0 ? T.green : T.error },
            ]}
          >
            {change >= 0 ? '+' : '−'}
            {Math.abs(change).toFixed(2)}%
          </Text>
        ) : price == null ? (
          <Skeleton width={40} height={11} radius={4} />
        ) : null}
      </View>
    </View>
  );
}
