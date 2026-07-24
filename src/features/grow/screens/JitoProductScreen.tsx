/**
 * JitoSOL product detail — reached from the Earn screen's "Available products"
 * card. Layout: Balance hero (wallet-screen style) → Pool info card, over a
 * pinned Deposit / Withdraw footer. The "?" in the header opens the About sheet
 * (the `/jito-about` transparent-modal route, built on the shared SheetShell).
 *
 * Pool stats (mint, TVL, exchange rate, supply) come live from `usePoolInfo`
 * (getPoolInfo) with "—" fallback on a devnet RPC. APY is still a placeholder
 * pending the APY-source decision — no fetch is wired here. The Balance and
 * Withdraw gating use a placeholder JitoSOL balance (0 for now).
 */
import { ReactNode, useState } from 'react';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { splitUsd } from '@/src/features/home/lib/formatUsd';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { usePoolInfo } from '../hooks/usePoolInfo';
import { useJitoSolPosition } from '../hooks/useJitoSolBalance';
import { formatCompact } from '../lib/formatCompact';

const S = txPalette('silver');

/** Placeholder until the APY source is wired (kept honest — 0 when unknown). */
const FALLBACK_APY_PCT = 0;
/** JitoSOL mint (fallback when the live pool account isn't available). */
const JITOSOL_MINT = 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn';

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

function fmtJitoSol(n: number): string {
  if (n === 0) return '0';
  return n.toFixed(4).replace(/\.?0+$/, '');
}

export function JitoProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { data } = usePoolInfo();

  const { jitoSol, usdValue } = useJitoSolPosition();
  const [copied, setCopied] = useState(false);

  const apyPct =
    data?.apy != null && Number.isFinite(data.apy)
      ? data.apy * 100
      : FALLBACK_APY_PCT;

  const mint = data?.poolMint ?? JITOSOL_MINT;
  const exchangeRate = data
    ? `1 ≈ ${data.solJitoConversion.toFixed(4)} SOL`
    : '—';
  const tvl = data
    ? `${formatCompact(Number(data.totalLamports) / 1e9)} SOL`
    : '—';
  const supply = data
    ? `${formatCompact(Number(data.totalPoolTokens) / 1e9)} JitoSOL`
    : '—';

  const { int, dec } = splitUsd(usdValue);
  const canWithdraw = jitoSol > 0;

  const copyMint = () => {
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
        {/* Header: back · logo + title · help */}
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
            <Image
              source={require('@/assets/images/jito.png')}
              style={{ width: 30, height: 30, borderRadius: 15 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <Text
              style={[
                sansation,
                { fontSize: 22, lineHeight: 28, fontWeight: '600', color: T.ink },
              ]}
            >
              jitoSOL
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/jito-about')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="About jitoSOL"
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
            {fmtJitoSol(jitoSol)} JitoSOL
          </Text>
        </View>

        {/* Pool info */}
        <Text
          style={[
            sansation,
            { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2, color: S.ink, marginBottom: 12 },
          ]}
        >
          Pool info
        </Text>
        <BlurGlass radius={22} innerStyle={{ padding: 22 }}>
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
          <InfoRow
            iconKey="trend"
            label="APY"
            value={<Text style={[sansation, { fontSize: 15, fontWeight: '600', color: T.green }]}>+{apyPct.toFixed(2)}%</Text>}
          />
          <InfoRow iconKey="swapV" label="Exchange rate" value={exchangeRate} />
          <InfoRow iconKey="bank" label="Total value locked" value={tvl} />
          <InfoRow iconKey="invest" label="JitoSOL supply" value={supply} />
          <InfoRow iconKey="user" label="Provider" value="Jito" />
        </BlurGlass>
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
            label="Deposit"
            variant="primary"
            tone="silver"
            onPress={() => router.push('/stake-deposit')}
            rightIcon={<Icons.arrDownRight size={16} color="#0a0a0a" />}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PillBtn
            label="Withdraw"
            variant="secondary"
            tone="silver"
            disabled={!canWithdraw}
            onPress={() => router.push('/stake-withdraw')}
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
