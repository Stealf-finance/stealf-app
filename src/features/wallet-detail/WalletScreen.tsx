import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssetRow } from '@/src/design-system/primitives/AssetRow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { txPalette, type Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { sansation, serif } from '@/src/design-system/typography';
import { splitUsd } from '@/src/features/home/lib/formatUsd';
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
  balanceUSD: number;
  assets: WalletAsset[];
  /** Optional slot rendered right under the balance (e.g. a Claim button). */
  belowBalance?: ReactNode;
  /** Optional slot rendered after the assets list (e.g. an "Available
   *  products" section). When provided, the empty-assets placeholder is
   *  suppressed — the footer is the screen's content instead. */
  footer?: ReactNode;
  /** Optional bottom bar (left pill + FAB); omit for no bottom nav. */
  bottomBar?: ReactNode;
  tone?: Tone;
};

/**
 * Shared wallet-detail scaffold (Cash / Earn / Encrypted Balance / Wallet):
 * header (back + icon + title) → Balance → assets list, over the app nav bar.
 * Per-wallet actions live in the nav bar's "+" menu. Follows the type scale
 * (Title 28 / Display 48 / Caption 14) and 8-pt spacing.
 */
export function WalletScreen({
  title,
  iconImage,
  balanceUSD,
  assets,
  belowBalance,
  footer,
  bottomBar,
  tone = 'silver',
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const pal = txPalette(tone);
  const { int, dec } = splitUsd(balanceUSD);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
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
                { fontSize: 22, lineHeight: 28, fontWeight: '600', color: T.ink },
              ]}
            >
              {title}
            </Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        {/* Balance */}
        <View style={{ marginBottom: 40 }}>
          <Text
            style={[sansation, { fontSize: 14, lineHeight: 20, color: pal.inkDim, marginBottom: 8 }]}
          >
            Balance
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={[
                serif,
                { fontSize: 22, fontStyle: 'italic', color: pal.accent, includeFontPadding: false },
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
            <Text style={[sansation, { fontSize: 22, color: pal.inkDim, includeFontPadding: false }]}>
              {dec}
            </Text>
          </View>

          {belowBalance ? <View style={{ marginTop: 16 }}>{belowBalance}</View> : null}
        </View>

        {/* Assets */}
        {assets.length === 0 ? (
          footer ? null : (
            <Text style={{ fontSize: 14, color: pal.inkFaint, paddingVertical: 16 }}>
              No assets yet.
            </Text>
          )
        ) : (
          assets.map((a, i) => (
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
          ))
        )}

        {footer ? <View style={{ marginTop: 8 }}>{footer}</View> : null}
      </ScrollView>

      {bottomBar}
    </View>
  );
}
