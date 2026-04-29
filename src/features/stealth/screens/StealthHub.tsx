import { useEffect } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { PrivacyGauge } from '@/src/design-system/primitives/PrivacyGauge';
import { SquareActionTile } from '@/src/design-system/primitives/SquareActionTile';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import {
  PrivacyMode,
  usePrivacyMode,
} from '@/src/features/stealth/PrivacyModeContext';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';
import { useFeatureFlag } from '@/src/services/observability/featureFlags';

const FADE_OUT = 180;
const FADE_IN = 240;
const MORPH_DUR = 420;

const SILVER = txPalette('silver');
const GOLD = txPalette('gold');

export function StealthHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, setMode, tone } = usePrivacyMode();
  const isPrivate = mode === 'private';
  const palette = txPalette(tone);

  // Killswitch: hide the slice if the flag is flipped off in PostHog.
  // Default-on so design work in DEV is unaffected.
  const stealthEnabled = useFeatureFlag('slice-stealth-enabled', true);

  const { data: pendingClaims } = usePendingClaims();
  const claimCount = pendingClaims?.length ?? 0;

  const balance = isPrivate
    ? { int: '133', dec: '.25' }
    : { int: '34', dec: '.51' };
  const kicker = isPrivate ? 'Shielded Pool' : 'Stealth Wallet';
  const subkicker = isPrivate ? 'private' : 'public';

  const modeProgress = useSharedValue(isPrivate ? 1 : 0);
  const contentOpacity = useSharedValue(1);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Keep modeProgress in sync if the context mode changes externally
  // (e.g. from another screen, future: a global toggle elsewhere).
  useEffect(() => {
    modeProgress.value = withTiming(isPrivate ? 1 : 0, { duration: MORPH_DUR });
  }, [isPrivate, modeProgress]);

  if (!stealthEnabled) {
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
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 3.2,
                textTransform: 'uppercase',
                color: SILVER.accent,
                fontWeight: '700',
                marginBottom: 12,
              },
            ]}
          >
            Stealth
          </Text>
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

  const switchMode = (target: PrivacyMode) => {
    if (target === mode) return;
    modeProgress.value = withTiming(target === 'private' ? 1 : 0, {
      duration: MORPH_DUR,
    });
    contentOpacity.value = withTiming(0, { duration: FADE_OUT }, (done) => {
      if (!done) return;
      runOnJS(setMode)(target);
      contentOpacity.value = withTiming(1, { duration: FADE_IN });
    });
  };

  // Carousel direction: swipe left = next item (private, right dot),
  // swipe right = previous item (public, left dot). At the boundary the
  // target equals the current mode and switchMode no-ops.
  const panHandlers = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 40) {
        switchMode(g.dx < 0 ? 'private' : 'public');
      }
    },
  }).panHandlers;

  return (
    <TonalBackground tone={tone}>
      {/* Greeting row */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <CircleIconBtn iconKey="history" tone={tone} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleIconBtn
            iconKey="card"
            tone={tone}
            onPress={() => router.push('/card')}
          />
          <CircleIconBtn iconKey="bell" tone={tone} hasDot />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Swipe-toggle zone: kicker + gauge + dots only */}
        <View {...panHandlers}>
          {/* Kicker + subkicker — cross-fades on mode swap */}
          <Animated.View
            style={[
              {
                alignItems: 'center',
                paddingTop: 20,
                marginBottom: 24,
              },
              contentStyle,
            ]}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View
                style={{
                  width: 18,
                  height: 1,
                  backgroundColor: palette.accentDim,
                }}
              />
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 10,
                    letterSpacing: 3.2,
                    textTransform: 'uppercase',
                    color: palette.accent,
                    fontWeight: '700',
                  },
                ]}
              >
                {kicker}
              </Text>
              <View
                style={{
                  width: 18,
                  height: 1,
                  backgroundColor: palette.accentDim,
                }}
              />
            </View>
            <Text
              style={[
                serif,
                {
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: palette.inkDim,
                  marginTop: 6,
                },
              ]}
            >
              {subkicker}
            </Text>
          </Animated.View>

          {/* Gauge — morphs continuously, no fade */}
          <View
            style={{
              position: 'relative',
              height: 220,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <PrivacyGauge
              modeProgress={modeProgress}
              publicValue={0.22}
              privateValue={0.86}
              publicColor={SILVER.accent}
              privateColor={GOLD.accent}
              publicGlow={SILVER.accentGlow}
              privateGlow={GOLD.accentGlow}
              size={210}
              thickness={5}
            />

            {/* Center balance — cross-fade on mode swap */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                contentStyle,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  style={[
                    serif,
                    {
                      fontSize: 30,
                      color: palette.accent,
                      fontStyle: 'italic',
                      lineHeight: 30,
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
                      fontSize: 64,
                      letterSpacing: -2.56,
                      lineHeight: 64,
                      color: palette.ink,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {balance.int}
                </Text>
                <Text
                  style={[
                    sansationLight,
                    {
                      fontSize: 28,
                      color: palette.inkDim,
                      letterSpacing: -0.56,
                      lineHeight: 28,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {balance.dec}
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Dots indicator — stays visible, snaps width */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 36,
            }}
          >
            {(['public', 'private'] as const).map((m) => {
              const isActive = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${m} mode`}
                  hitSlop={8}
                  style={{
                    width: isActive ? 22 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isActive
                      ? palette.accent
                      : 'rgba(255,255,255,0.2)',
                    shadowColor: isActive ? palette.accentGlow : 'transparent',
                    shadowOpacity: isActive ? 1 : 0,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
              );
            })}
          </View>
        </View>
        {/* /swipe-toggle zone */}

        {/* Action tiles — cross-fade on mode swap */}
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              gap: 8,
              paddingBottom: 40,
            },
            contentStyle,
          ]}
        >
          {isPrivate ? (
            <>
              <SquareActionTile
                iconKey="shieldOff"
                label="Unshield"
                onPress={() => router.push('/unshield')}
              />
              <SquareActionTile
                iconKey="moove"
                label="Moove"
                accent
                accentTone="gold"
                onPress={() => router.push('/moove')}
              />
              <SquareActionTile
                iconKey="arrUp"
                label="Send"
                onPress={() => router.push('/send?tone=gold')}
              />
              <SquareActionTile
                iconKey="gift"
                label="Claim"
                badge={claimCount}
                onPress={() => router.push('/claim-pending')}
              />
            </>
          ) : (
            <>
              <SquareActionTile
                iconKey="arrDown"
                label="Receive"
                onPress={() => router.push('/add-funds?tone=silver')}
              />
              <SquareActionTile
                iconKey="arrUp"
                label="Send"
                onPress={() => router.push('/send')}
              />
              <SquareActionTile
                iconKey="shieldCheck"
                label="Shield"
                onPress={() => router.push('/shield')}
              />
              <SquareActionTile
                iconKey="more"
                label="More"
                iconColor="#ffffff"
              />
            </>
          )}
        </Animated.View>

        {/* Assets */}
        <Text
          style={[
            sansationLight,
            {
              fontSize: 22,
              letterSpacing: -0.44,
              color: palette.ink,
              marginBottom: 4,
            },
          ]}
        >
          Assets
        </Text>

        <View style={{ paddingTop: 6 }}>
          <View
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: palette.hairline,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <Image
              source={require('@/assets/images/solana-icon.png')}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: palette.ink }}>SOL</Text>
              <Text
                style={{
                  fontSize: 11,
                  color: palette.inkFaint,
                  marginTop: 2,
                }}
              >
                {isPrivate ? '1.5077 · encrypted' : '0.3904 · on-chain'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15, color: palette.ink }}>
                ${balance.int}
                {balance.dec}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: T.green,
                  marginTop: 2,
                }}
              >
                +3.43%
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </TonalBackground>
  );
}
