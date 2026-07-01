import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { LineChart } from '@/src/design-system/primitives/LineChart';
import { RangePills } from '@/src/design-system/primitives/RangePills';
import {
  mono,
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { JitoMark } from '@/src/features/grow/JitoMark';
import { UsdcPlusCard } from '@/src/features/grow/components/UsdcPlusCard';
import { useFeatureFlag } from '@/src/services/observability/featureFlags';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getGreeting } from '@/src/lib/greeting';

const S = txPalette('silver');
const RANGES = ['1W', '1M', '1Y', 'Max'] as const;
type Range = (typeof RANGES)[number];

export function GrowHub() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [range, setRange] = useState<Range>('1Y');

  // TEMP: default forced to `true` so the Grow/STLF card shows in any build
  // (dev bypasses PostHog). Revert to `false` for a PostHog-gated prod rollout.
  const growEnabled = useFeatureFlag('slice-grow-enabled', true);
  const { user } = useAuth();
  const username = user?.username ?? '';
  const greeting = getGreeting();

  if (!growEnabled) {
    return (
      <TonalBackground tone="silver">
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top,
            paddingHorizontal: 32,
          }}
        >
          <Kicker
            color={S.accent}
            style={{ letterSpacing: 3.2, marginBottom: 12 }}
          >
            Grow
          </Kicker>
          <Text
            style={[
              sansationLight,
              {
                fontSize: 28,
                color: T.ink,
                textAlign: 'center',
              },
            ]}
          >
            Coming soon
          </Text>
        </View>
      </TonalBackground>
    );
  }

  return (
    <TonalBackground tone="silver">
      {/* Greeting row */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: S.inkDim, fontWeight: '300' }}>
          {greeting}, <Text style={{ color: S.ink }}>{username}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleIconBtn iconKey="info" />
          <CircleIconBtn iconKey="bell" hasDot tone="gold" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Kicker */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 18,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View
              style={{ width: 18, height: 1, backgroundColor: T.goldDim }}
            />
            <Kicker color={T.gold} style={{ letterSpacing: 3.2 }}>
              Grow
            </Kicker>
            <View
              style={{ width: 18, height: 1, backgroundColor: T.goldDim }}
            />
          </View>
        </View>

        {/* Balance hero (gold $) */}
        <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={[
                serif,
                {
                  fontSize: 36,
                  color: T.gold,
                  fontStyle: 'italic',
                  lineHeight: 36,
                  includeFontPadding: false,
                },
              ]}
            >
              $
            </Text>
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 76,
                  letterSpacing: -3.04,
                  lineHeight: 76,
                  color: S.ink,
                  includeFontPadding: false,
                },
              ]}
            >
              2,847
            </Text>
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 32,
                  color: S.inkDim,
                  letterSpacing: -0.64,
                  lineHeight: 32,
                  includeFontPadding: false,
                },
              ]}
            >
              .12
            </Text>
          </View>
          <Text
            style={[
              serif,
              {
                fontSize: 15,
                color: T.gold,
                fontStyle: 'italic',
                marginTop: 12,
                letterSpacing: -0.15,
              },
            ]}
          >
            +$184.26 earned
          </Text>
        </View>

        {/* Full-bleed chart */}
        <View style={{ marginTop: 18 }}>
          <LineChart width={screenW} height={160} />
        </View>

        {/* Range pills */}
        <RangePills value={range} options={RANGES} onChange={setRange} />

        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          {/* Assets section */}
          <Text
            style={[
              sansationLight,
              {
                fontSize: 22,
                letterSpacing: -0.44,
                color: S.ink,
                marginBottom: 12,
              },
            ]}
          >
            Assets
          </Text>

          {/* Position card — same chrome as BankWallet "Bank without limits" */}
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.6,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 20 },
            }}
          >
            <LinearGradient
              colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{
                paddingVertical: 20,
                paddingHorizontal: 22,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* top sheen */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '45%',
                }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.04)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ flex: 1 }}
                />
              </View>

              <JitoMark size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: S.ink,
                    fontWeight: '500',
                    letterSpacing: -0.16,
                  }}
                >
                  jitoSOL
                </Text>
                <Text
                  style={[
                    mono,
                    {
                      fontSize: 12,
                      color: S.inkFaint,
                      marginTop: 3,
                      letterSpacing: 0.24,
                    },
                  ]}
                >
                  19.42 SOL staked
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Kicker
                  color={S.inkFaint}
                  style={{ fontSize: 9, letterSpacing: 1.98 }}
                >
                  APY
                </Kicker>
                <Text
                  style={[
                    mono,
                    {
                      fontSize: 16,
                      color: T.gold,
                      fontWeight: '600',
                      textShadowColor: T.goldGlow,
                      textShadowRadius: 8,
                      textShadowOffset: { width: 0, height: 0 },
                    },
                  ]}
                >
                  7.84%
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* USDC+ (Reflect) — live yield position */}
          <UsdcPlusCard />
        </View>
      </ScrollView>
    </TonalBackground>
  );
}
