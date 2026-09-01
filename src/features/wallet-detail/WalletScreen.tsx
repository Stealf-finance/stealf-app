import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssetRow } from '@/src/design-system/primitives/AssetRow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { txPalette, type Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { sansation, serif } from '@/src/design-system/typography';
import { splitUsd } from '@/src/features/home/lib/formatUsd';
import { resolveAssetsState } from '@/src/features/wallet-detail/lib/loadingState';
import { resolveValueState } from '@/src/lib/asyncValue';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

export type WalletAsset = {
  key: string;
  iconSource: ImageSource | number | undefined;
  symbol: string;
  caption: string;
  priceLabel: string;
};

type Props = {
  title: string;
  /** 3D image asset (require(...)) shown next to the title. */
  iconImage: number;
  /** The USD total, or `undefined` while it is still unknown — a query that
   *  hasn't resolved, or one still disabled waiting on auth. Renders as a
   *  skeleton, never as `$0`: on a banking screen an unknown balance and an
   *  empty one must not look alike. */
  balanceUSD: number | undefined;
  /** The holdings, or `undefined` while unknown. An empty array is the
   *  distinct "this wallet genuinely holds nothing" case. */
  assets: WalletAsset[] | undefined;
  /** The query settled in error with nothing cached to fall back on. Takes
   *  over from the skeleton, which would otherwise pulse forever. */
  error?: boolean;
  /** Optional slot on the header's right edge, level with the title (e.g. the
   *  Claim vault on Private Balance). Absent, the slot just balances the back
   *  chevron so the title stays centred. */
  headerRight?: ReactNode;
  /** Optional slot rendered right under the balance. */
  belowBalance?: ReactNode;
  /** Optional slot rendered after the assets list (e.g. an "Available
   *  products" section). When provided, the assets placeholders — empty *and*
   *  loading — are suppressed: the footer is the screen's content instead. A
   *  failure is still reported. */
  footer?: ReactNode;
  /** Optional bottom bar (left pill + FAB); omit for no bottom nav. */
  bottomBar?: ReactNode;
  tone?: Tone;
};

/**
 * Shared wallet-detail scaffold (Public Balance / Private Balance / Earn):
 * header (back + icon + title) → Balance → assets list, over the app nav bar.
 * Per-wallet actions live in the nav bar's "+" menu. Follows the type scale
 * (Title 28 / Display 48 / Caption 14) and 8-pt spacing.
 */
export function WalletScreen({
  title,
  iconImage,
  balanceUSD,
  assets,
  error = false,
  headerRight,
  belowBalance,
  footer,
  bottomBar,
  tone = 'silver',
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const pal = txPalette(tone);
  const balanceState = resolveValueState(balanceUSD, error);
  const { int, dec } = splitUsd(balanceUSD ?? 0);
  const placeholderText = {
    fontSize: 14,
    color: pal.inkFaint,
    paddingVertical: 16,
  } as const;

  let assetsBody: ReactNode = null;
  const assetsState = resolveAssetsState(assets, error, Boolean(footer));
  if (assetsState === 'error') {
    assetsBody = (
      <Text style={placeholderText}>Couldn&apos;t load your assets.</Text>
    );
  } else if (assetsState === 'skeleton') {
    assetsBody = <AssetRowsSkeleton hairline={pal.hairline} />;
  } else if (assetsState === 'empty') {
    assetsBody = <Text style={placeholderText}>No assets yet.</Text>;
  } else if (assetsState === 'rows' && assets) {
    assetsBody = assets.map((a, i) => (
      <AssetRow
        key={a.key}
        iconSource={a.iconSource}
        symbol={a.symbol}
        caption={a.caption}
        priceLabel={a.priceLabel}
        ink={pal.ink}
        inkFaint={pal.inkFaint}
        hairline={pal.hairline}
        last={i === assets.length - 1}
      />
    ));
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + (bottomBar ? 120 : 40),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: back on the left, icon + title centered (spacer balances) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <GlassBackButton onPress={() => router.back()} />
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <Image
              source={iconImage}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text
              style={[
                sansation,
                {
                  fontSize: 22,
                  lineHeight: 28,
                  fontWeight: '600',
                  color: T.ink,
                },
              ]}
            >
              {title}
            </Text>
          </View>
          {/* Balances the back chevron; holds `headerRight` when given. */}
          <View style={{ minWidth: 26, alignItems: 'flex-end' }}>
            {headerRight}
          </View>
        </View>

        {/* Balance */}
        <View style={{ marginBottom: 40 }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 14,
                lineHeight: 20,
                color: pal.inkDim,
                marginBottom: 8,
              },
            ]}
          >
            Balance
          </Text>
          {/* Known amount, skeleton while unknown, em dash when the fetch
              failed. The wrapper holds the amount's 52-pt line height in all
              three so the rest of the screen doesn't shift when it lands. */}
          {balanceState === 'value' ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text
                style={[
                  serif,
                  {
                    fontSize: 22,
                    fontStyle: 'italic',
                    color: pal.accent,
                    includeFontPadding: false,
                  },
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
                    color: pal.ink,
                    includeFontPadding: false,
                  },
                ]}
              >
                {int}
              </Text>
              <Text
                style={[
                  sansation,
                  { fontSize: 22, color: pal.inkDim, includeFontPadding: false },
                ]}
              >
                {dec}
              </Text>
            </View>
          ) : (
            <View style={{ height: 52, justifyContent: 'center' }}>
              {balanceState === 'error' ? (
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 48,
                      lineHeight: 52,
                      letterSpacing: -1.5,
                      color: pal.inkFaint,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  &mdash;
                </Text>
              ) : (
                <Skeleton width={180} height={40} radius={10} />
              )}
            </View>
          )}

          {belowBalance ? (
            <View style={{ marginTop: 16 }}>{belowBalance}</View>
          ) : null}
        </View>

        {/* Assets */}
        {assetsBody}

        {footer ? <View style={{ marginTop: 8 }}>{footer}</View> : null}
      </ScrollView>

      {bottomBar}
    </View>
  );
}

/** Three placeholder rows shaped like `AssetRow` — 40-pt round icon, two text
 *  lines, a price on the right — so the list keeps its height while the real
 *  holdings load. */
function AssetRowsSkeleton({ hairline }: { hairline: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            paddingVertical: 14,
            borderBottomWidth: i === 2 ? 0 : 1,
            borderBottomColor: hairline,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Skeleton width={40} height={40} radius={20} />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Skeleton width={72} height={13} />
            <Skeleton width={112} height={10} />
          </View>
          <Skeleton width={64} height={15} />
        </View>
      ))}
    </>
  );
}
