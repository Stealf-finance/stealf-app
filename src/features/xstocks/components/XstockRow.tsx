/**
 * One xStock row inside the "Tokenized Stocks" group card: logo + name on the
 * left, live reference price + 24h change on the right. Taps into the xStock
 * detail screen. The skeleton shows only while the detail query is loading.
 */
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import type { SolanaXstock } from '../api/assets';
import { useXstockAsset } from '../hooks/useXstockAsset';
import { displayName, formatUsd } from '../lib/format';

const S = txPalette('silver');

export function XstockRow({ asset }: { asset: SolanaXstock }) {
  const router = useSafeRouter();
  const { data: detail, isPending } = useXstockAsset(asset.symbol);
  const price = detail?.referencePrice;
  const change = detail?.priceChange24h;

  return (
    <Pressable
      onPress={() => router.push(`/xstock/${asset.symbol}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}
    >
      <Image
        source={{ uri: asset.logo }}
        style={{ width: 38, height: 38, borderRadius: 19 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[sansation, { fontSize: 16, color: S.ink }]}>
          {displayName(asset.name)}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        {isPending ? (
          <>
            <Skeleton width={64} height={15} radius={5} />
            <Skeleton width={40} height={11} radius={4} />
          </>
        ) : (
          <>
            <Text style={[sansation, { fontSize: 16, fontWeight: '600', color: S.ink }]}>
              {price != null ? formatUsd(price) : '—'}
            </Text>
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
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

/** `XstockRow`'s shape without an asset to fill it — the logo disc, the name,
 *  and the price/change pair. Used while the catalogue itself is loading,
 *  where there is not even a symbol to hand to the real row. */
export function XstockRowSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
      }}
    >
      <Skeleton width={38} height={38} radius={19} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Skeleton width={132} height={16} radius={5} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Skeleton width={64} height={15} radius={5} />
        <Skeleton width={40} height={11} radius={4} />
      </View>
    </View>
  );
}
