/**
 * STLF "Savings" product card for the Earn "Available products" hub. BlurGlass
 * card: mark + APY pill + Balance/Earning/Type stats; taps into the STLF product
 * screen. APY is the holder's live Reflect yield (stats.realtimeApy); balance is
 * the bank wallet's STLF holding. STLF is Stealf's branded stablecoin backed by
 * Reflect USDC+.
 */
import { Pressable, Text, View } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useReflectStats, useReflectBalance } from '../hooks/useReflectData';
import { StlfMark } from './StlfMark';

const S = txPalette('silver');

/** Shown while the live holder APY is loading or unavailable. */
const FALLBACK_APY_PCT = 0.0;

export function StlfProductCard() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const { data: stats } = useReflectStats();
  const { data: balance } = useReflectBalance(user?.bankWallet);

  const apyPct =
    typeof stats?.realtimeApy === 'number' ? stats.realtimeApy : FALLBACK_APY_PCT;
  const apyLabel = `${apyPct.toFixed(2)}% APY`;
  const usdValue = balance?.usdValue ?? 0;
  const balanceLabel = usdValue > 0 ? `$${usdValue.toFixed(2)}` : '$0';

  return (
    <Pressable onPress={() => router.push('/stlf')}>
      <BlurGlass radius={22} innerStyle={{ padding: 20 }}>
        {/* Header: mark + (title row with APY pill → kicker) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <StlfMark size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 17,
                    lineHeight: 22,
                    fontWeight: '600',
                    letterSpacing: -0.2,
                    color: S.ink,
                    flexShrink: 1,
                  },
                ]}
                numberOfLines={1}
              >
                Savings
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text
                  style={[
                    sansation,
                    { fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.green },
                  ]}
                >
                  {apyLabel}
                </Text>
              </View>
            </View>
            <Text
              style={[sansation, { fontSize: 13, lineHeight: 18, color: S.inkDim, marginTop: 3 }]}
            >
              STLF · Reflect
            </Text>
          </View>
        </View>

        {/* Position stats. Balance is live; Earning needs a cost basis we don't
            track yet, so it stays a placeholder for now. */}
        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          <CardStat label="Balance" value={balanceLabel} />
          <CardStat label="Earning" value="$0" />
          <CardStat label="Type" value="Stablecoin" />
        </View>
      </BlurGlass>
    </Pressable>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[sansation, { fontSize: 12, lineHeight: 16, color: S.inkFaint }]}>
        {label}
      </Text>
      <Text
        style={[sansation, { fontSize: 15, lineHeight: 20, fontWeight: '500', color: S.ink, marginTop: 4 }]}
      >
        {value}
      </Text>
    </View>
  );
}
