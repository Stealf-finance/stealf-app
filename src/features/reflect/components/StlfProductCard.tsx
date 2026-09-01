/**
 * STLF "Savings" product card for the Earn "Available products" hub. BlurGlass
 * card: logo + APY pill + Balance/Earning/Type stats; taps into the STLF product
 * screen. APY is the holder's live Reflect yield (stats.realtimeApy); balance is
 * the bank wallet's STLF holding. STLF is Stealf's branded stablecoin backed by
 * Reflect USDC+.
 */
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { resolveValueState, type AsyncValueState } from '@/src/lib/asyncValue';
import { useReflectStats, useReflectBalance } from '../hooks/useReflectData';

const S = txPalette('silver');

export function StlfProductCard() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const statsQuery = useReflectStats();
  const balanceQuery = useReflectBalance(user?.bankWallet);

  // `api/reflect` catches its own network errors and resolves to `null`, so
  // these queries never report `isError`. Holding *anything* — including that
  // null — means the fetch settled; if no usable figure came out of it, that's
  // a failure, not work still in flight.
  const apy =
    typeof statsQuery.data?.realtimeApy === 'number'
      ? statsQuery.data.realtimeApy
      : undefined;
  const apyState = resolveValueState(
    apy,
    statsQuery.data !== undefined || statsQuery.isError,
  );
  const apyLabel = apy !== undefined ? `${apy.toFixed(2)}% APY` : '— APY';

  const usdValue = balanceQuery.data?.usdValue;
  const balanceState = resolveValueState(
    usdValue,
    balanceQuery.data !== undefined || balanceQuery.isError,
  );
  const balanceLabel =
    usdValue === undefined
      ? '—'
      : usdValue > 0
        ? `$${usdValue.toFixed(2)}`
        : '$0';

  return (
    <Pressable onPress={() => router.push('/stlf')}>
      <BlurGlass radius={22} innerStyle={{ padding: 20 }}>
        {/* Header: logo + (title row with APY pill → kicker) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
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
                Yield-bearing stablecoin
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              >
                {apyState === 'skeleton' ? (
                  <Skeleton width={56} height={16} radius={8} />
                ) : (
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 12,
                        lineHeight: 16,
                        fontWeight: '600',
                        color: T.green,
                      },
                    ]}
                  >
                    {apyLabel}
                  </Text>
                )}
              </View>
            </View>
            <Text
              style={[
                sansation,
                { fontSize: 13, lineHeight: 18, color: S.inkDim, marginTop: 3 },
              ]}
            >
              $STLF · Reflect
            </Text>
          </View>
        </View>

        {/* Position stats. Balance is live; Earning needs a cost basis we don't
            track yet, so it stays a placeholder for now. */}
        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          <CardStat label="Balance" value={balanceLabel} state={balanceState} />
          <CardStat label="Earning" value="$0" />
          <CardStat label="Type" value="Stablecoin" />
        </View>
      </BlurGlass>
    </Pressable>
  );
}

function CardStat({
  label,
  value,
  state = 'value',
}: {
  label: string;
  value: string;
  state?: AsyncValueState;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={[sansation, { fontSize: 12, lineHeight: 16, color: S.inkFaint }]}
      >
        {label}
      </Text>
      {state === 'skeleton' ? (
        <View style={{ height: 20, justifyContent: 'center', marginTop: 4 }}>
          <Skeleton width={52} height={14} radius={5} />
        </View>
      ) : (
        <Text
          style={[
            sansation,
            {
              fontSize: 15,
              lineHeight: 20,
              fontWeight: '500',
              color: S.ink,
              marginTop: 4,
            },
          ]}
        >
          {value}
        </Text>
      )}
    </View>
  );
}
