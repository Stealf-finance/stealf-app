import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { mono, sansationLight } from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { UsdcPlusCard } from '@/src/features/grow/components/UsdcPlusCard';
import { useFeatureFlag } from '@/src/services/observability/featureFlags';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getGreeting } from '@/src/lib/greeting';

const S = txPalette('silver');

export function GrowHub() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
            paddingBottom: 22,
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

        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          {/* Assets section — only live, real-data positions are listed here.
              (The portfolio hero / chart and the jitoSOL mockup were removed:
              they were hardcoded placeholder numbers, and the MPC private-yield
              path is not wired on the client yet.) */}
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

          {/* USDC+ (Reflect) — live yield position */}
          <UsdcPlusCard />

          {/* Tokenized stocks — entry point into the xStocks flow */}
          <TouchableOpacity
            onPress={() => router.push('/xstocks')}
            activeOpacity={0.7}
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginTop: 12,
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

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: S.ink,
                    fontWeight: '500',
                    letterSpacing: -0.16,
                  }}
                >
                  Stocks
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
                  Tokenized equities · Buy &amp; sell
                </Text>
              </View>
              <Kicker color={T.gold} style={{ letterSpacing: 2.2 }}>
                Invest
              </Kicker>
            </LinearGradient>
          </TouchableOpacity>

          {/* JitoSOL liquid staking — entry point into the staking screen */}
          <TouchableOpacity
            onPress={() => router.push('/jito')}
            activeOpacity={0.7}
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginTop: 12,
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

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: S.ink,
                    fontWeight: '500',
                    letterSpacing: -0.16,
                  }}
                >
                  Staking
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
                  JitoSOL · Earn native SOL yield
                </Text>
              </View>
              <Kicker color={T.gold} style={{ letterSpacing: 2.2 }}>
                Stake
              </Kicker>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TonalBackground>
  );
}
