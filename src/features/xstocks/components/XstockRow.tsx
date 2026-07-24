/**
 * One xStock row inside the "Tokenized Stocks" group card: logo + name on the
 * left, live reference price + 24h change on the right. The skeleton shows only
 * while the detail query is loading; once resolved it's the price (or "—") — not
 * an endless shimmer.
 */
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

/** Drop the "xStock" brand suffix from the display name (Apple xStock → Apple). */
function displayName(name: string): string {
  return name.replace(/\s*x-?stock\s*$/i, '').trim();
}

export function XstockRow({ asset }: { asset: SolanaXstock }) {
  const { data: detail, isPending } = useXstockAsset(asset.symbol);
  const price = detail?.referencePrice;
  const change = detail?.priceChange24h;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}>
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
    </View>
  );
}
