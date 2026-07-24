/**
 * xStock product detail — reached by tapping a row in the Earn "Tokenized
 * Stocks" card. Same pattern as the JitoSOL product screen: Balance hero (your
 * holding) → Market info (flat list) → pinned Buy / Sell footer. The "?" opens
 * the About sheet (`/xstock-about`).
 *
 * Price + 24h change come live from `useXstockAsset`; the holding from
 * `useXstockBalance` (stealth wallet). The Buy/Sell trade flow is wired in a
 * later slice — the buttons are present but inert for now.
 */
import { ReactNode, useState } from 'react';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { splitUsd } from '@/src/features/home/lib/formatUsd';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useXstockAsset } from '../hooks/useXstockAsset';
import { useXstockBalance } from '../hooks/useXstockBalance';
import { displayName, formatAmount, formatUsd } from '../lib/format';

const S = txPalette('silver');

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

export function XstockDetailScreen({ symbol }: { symbol: string }) {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { data: detail, isPending } = useXstockAsset(symbol);
  const { data: balance } = useXstockBalance(symbol);
  const [copied, setCopied] = useState(false);

  const name = detail ? displayName(detail.name) : symbol;
  const price = detail?.referencePrice ?? null;
  const change = detail?.priceChange24h ?? null;
  const mint = detail?.mint ?? '';

  const shares = balance?.uiAmount ?? 0;
  const { int, dec } = splitUsd(shares * (price ?? 0));
  const canSell = shares > 0;

  const copyMint = () => {
    if (!mint) return;
    void Clipboard.setStringAsync(mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: back · logo + name · help */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
          <GlassBackButton onPress={() => router.back()} />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {detail?.logo ? (
              <Image
                source={{ uri: detail.logo }}
                style={{ width: 30, height: 30, borderRadius: 15 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : null}
            <Text
              style={[sansation, { fontSize: 22, lineHeight: 28, fontWeight: '600', color: T.ink }]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/xstock-about')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="About xStocks"
            style={{ width: 40, alignItems: 'flex-end' }}
          >
            <Text style={[sansation, { fontSize: 20, fontWeight: '700', color: S.ink }]}>?</Text>
          </Pressable>
        </View>

        {/* Balance — your holding */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={[sansation, { fontSize: 14, lineHeight: 20, color: S.inkDim, marginBottom: 8 }]}
          >
            Balance
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={[
                serif,
                { fontSize: 22, fontStyle: 'italic', color: S.accent, includeFontPadding: false },
              ]}
            >
              $
            </Text>
            <Text
              style={[
                sansation,
                {
                  fontSize: 48,
                  lineHeight: 52,
                  letterSpacing: -1.5,
                  color: S.ink,
                  includeFontPadding: false,
                },
              ]}
            >
              {int}
            </Text>
            <Text style={[sansation, { fontSize: 22, color: S.inkDim, includeFontPadding: false }]}>
              {dec}
            </Text>
          </View>
          <Text style={[sansation, { fontSize: 13, color: S.inkFaint, marginTop: 8 }]}>
            {formatAmount(shares)} {detail?.symbol ?? symbol}
          </Text>
        </View>

        {/* Market info */}
        <Text
          style={[
            sansation,
            { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2, color: S.ink, marginBottom: 12 },
          ]}
        >
          Market info
        </Text>
        <View>
          <InfoRow
            iconKey="dollar"
            label="Price"
            value={
              isPending ? (
                <Skeleton width={70} height={15} radius={5} />
              ) : price != null ? (
                formatUsd(price)
              ) : (
                '—'
              )
            }
          />
          <InfoRow
            iconKey="trend"
            label="24h change"
            value={
              change != null ? (
                <Text
                  style={[
                    sansation,
                    { fontSize: 15, fontWeight: '600', color: change >= 0 ? T.green : T.error },
                  ]}
                >
                  {change >= 0 ? '+' : '−'}
                  {Math.abs(change).toFixed(2)}%
                </Text>
              ) : isPending ? (
                <Skeleton width={50} height={15} radius={5} />
              ) : (
                '—'
              )
            }
          />
          <InfoRow
            iconKey="key"
            label="Contract address"
            value={
              mint ? (
                <Pressable onPress={copyMint} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[sansation, { fontSize: 15, fontWeight: '500', color: S.ink }]}>
                    {shortAddr(mint)}
                  </Text>
                  {copied ? (
                    <Icons.check size={15} color={T.green} />
                  ) : (
                    <Icons.copy size={15} color={S.inkDim} />
                  )}
                </Pressable>
              ) : (
                '—'
              )
            }
          />
          <InfoRow iconKey="user" label="Provider" value="xStocks" />
        </View>
      </ScrollView>

      {/* Pinned actions — trade flow wired in a later slice (inert for now) */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <PillBtn
            label="Buy"
            variant="primary"
            tone="silver"
            rightIcon={<Icons.arrDownRight size={16} color="#0a0a0a" />}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PillBtn
            label="Sell"
            variant="secondary"
            tone="silver"
            disabled={!canSell}
            rightIcon={<Icons.arrUpRight size={16} color={T.ink} />}
          />
        </View>
      </View>
    </View>
  );
}

function InfoRow({
  iconKey,
  label,
  value,
}: {
  iconKey: keyof typeof Icons;
  label: string;
  value: ReactNode;
}) {
  const Icon = Icons[iconKey];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <Icon size={18} color={S.inkFaint} />
        <Text style={[sansation, { fontSize: 15, color: S.inkDim }]}>{label}</Text>
      </View>
      {typeof value === 'string' ? (
        <Text style={[sansation, { fontSize: 15, fontWeight: '500', color: S.ink }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}
