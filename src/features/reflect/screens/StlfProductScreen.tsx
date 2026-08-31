/**
 * STLF product detail — reached from the Earn screen's "Available products"
 * card. Layout: Balance hero (wallet-screen style) → Details card, over a pinned
 * Buy / Sell footer. The "?" in the header opens the About sheet (`/stlf-about`).
 *
 * STLF is Stealf's branded yield-bearing stablecoin backed by Reflect USDC+.
 * APY = the holder's live Reflect yield (stats.realtimeApy). Balance is the bank
 * wallet's STLF holding. Buy/Sell route into the amount-entry flow.
 */
import { ReactNode, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { splitUsd } from '@/src/features/home/lib/formatUsd';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useReflectStats, useReflectBalance } from '../hooks/useReflectData';
import { StlfMark } from '../components/StlfMark';

const S = txPalette('silver');

const FALLBACK_APY_PCT = 0;

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

function fmtStlf(n: number): string {
  if (n === 0) return '0';
  return n.toFixed(4).replace(/\.?0+$/, '');
}

function fmtCompactUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function StlfProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { user } = useAuth();

  const { data: stats } = useReflectStats();
  const { data: balance } = useReflectBalance(user?.bankWallet);
  const [copied, setCopied] = useState(false);

  const apyPct =
    typeof stats?.realtimeApy === 'number' ? stats.realtimeApy : FALLBACK_APY_PCT;
  const stlf = balance?.usdcPlusUiAmount ?? 0;
  const usdValue = balance?.usdValue ?? 0;
  const mint = balance?.mint ?? '';

  const rate = stats ? `1 STLF ≈ $${stats.rate.toFixed(4)}` : '—';
  const tvl = stats && stats.tvlUsd > 0 ? fmtCompactUsd(stats.tvlUsd) : '—';

  const { int, dec } = splitUsd(usdValue);
  const canSell = stlf > 0;

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
        {/* Header: back · mark + title · help */}
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
            <StlfMark size={30} />
            <Text
              style={[
                sansation,
                { fontSize: 22, lineHeight: 28, fontWeight: '600', color: T.ink },
              ]}
            >
              STLF
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/stlf-about')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="About STLF"
            style={{ width: 40, alignItems: 'flex-end' }}
          >
            <Text style={[sansation, { fontSize: 20, fontWeight: '700', color: S.ink }]}>?</Text>
          </Pressable>
        </View>

        {/* Balance — wallet-screen style */}
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
            {fmtStlf(stlf)} STLF
          </Text>
        </View>

        {/* Details */}
        <Text
          style={[
            sansation,
            { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2, color: S.ink, marginBottom: 12 },
          ]}
        >
          Details
        </Text>
        <View>
          {mint ? (
            <InfoRow
              iconKey="key"
              label="Contract address"
              value={
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
              }
            />
          ) : null}
          <InfoRow
            iconKey="trend"
            label="APY"
            value={<Text style={[sansation, { fontSize: 15, fontWeight: '600', color: T.green }]}>+{apyPct.toFixed(2)}%</Text>}
          />
          <InfoRow iconKey="swapV" label="Exchange rate" value={rate} />
          <InfoRow iconKey="bank" label="Total value locked" value={tvl} />
          <InfoRow iconKey="user" label="Provider" value="Reflect" />
        </View>
      </ScrollView>

      {/* Pinned actions */}
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
            onPress={() => router.push('/stlf-buy')}
            rightIcon={<Icons.arrDownRight size={16} color="#0a0a0a" />}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PillBtn
            label="Sell"
            variant="secondary"
            tone="silver"
            disabled={!canSell}
            onPress={() => router.push('/stlf-sell')}
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
