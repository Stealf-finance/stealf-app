/**
 * JitoSOL "Liquid staking" product card for the Earn "Available products" hub.
 * BlurGlass card: logo + APY pill + Balance/Earning/Type stats; taps into the
 * JitoSOL product screen. APY is live (useJitoApy), balance live
 * (useJitoSolPosition); Earning is a placeholder until we track a cost basis.
 */
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { Skeleton } from '@/src/design-system/primitives/Skeleton';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { resolveValueState, type AsyncValueState } from '@/src/lib/asyncValue';
import { useJitoApy } from '../hooks/useJitoApy';
import { useJitoSolPosition } from '../hooks/useJitoSolBalance';

const S = txPalette('silver');

export function JitoProductCard() {
  const router = useSafeRouter();
  const apyQuery = useJitoApy();
  const apy = typeof apyQuery.data === 'number' ? apyQuery.data : undefined;
  const apyState = resolveValueState(apy, apyQuery.isError);
  const apyLabel = apy !== undefined ? `${apy.toFixed(2)}% APY` : '— APY';

  const { usdValue, error: positionError } = useJitoSolPosition();
  const balanceState = resolveValueState(usdValue, positionError);
  const balanceLabel =
    usdValue === undefined
      ? '—'
      : usdValue > 0
        ? `$${usdValue.toFixed(2)}`
        : '$0';

  return (
    <Pressable onPress={() => router.push('/jitosol')}>
      <BlurGlass radius={22} innerStyle={{ padding: 20 }}>
        {/* Header: logo + (title row with APY pill → kicker) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Image
            source={require('@/assets/images/jito.png')}
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
                Liquid staking
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
                      { fontSize: 12, lineHeight: 16, fontWeight: '600', color: T.green },
                    ]}
                  >
                    {apyLabel}
                  </Text>
                )}
              </View>
            </View>
            <Text
              style={[sansation, { fontSize: 13, lineHeight: 18, color: S.inkDim, marginTop: 3 }]}
            >
              Jito
            </Text>
          </View>
        </View>

        {/* Position stats. Balance is live; Earning needs a cost basis we don't
            track yet, so it stays a placeholder for now. */}
        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          <CardStat label="Balance" value={balanceLabel} state={balanceState} />
          <CardStat label="Earning" value="$0" />
          <CardStat label="Type" value="Staking" />
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
      <Text style={[sansation, { fontSize: 12, lineHeight: 16, color: S.inkFaint }]}>
        {label}
      </Text>
      {state === 'skeleton' ? (
        <View style={{ height: 20, justifyContent: 'center', marginTop: 4 }}>
          <Skeleton width={52} height={14} radius={5} />
        </View>
      ) : (
        <Text
          style={[sansation, { fontSize: 15, lineHeight: 20, fontWeight: '500', color: S.ink, marginTop: 4 }]}
        >
          {value}
        </Text>
      )}
    </View>
  );
}
