import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationBold,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  tone?: Tone;
  kicker?: string;
  amount?: string;
  prefix?: string;
  subtitle?: string;
  onClose?: () => void;
  onDone?: () => void;
  onNewTransfer?: () => void;
  onViewExplorer?: () => void;
};

const CHECK_PATH = 'M18 30 L26 38 L42 22';
const CHECK_LEN = 36;

export function SuccessScreen({
  tone = 'silver',
  kicker = 'Sent',
  amount = '124.50',
  prefix = '$',
  subtitle = 'to @maria',
  onClose,
  onDone,
  onNewTransfer,
  onViewExplorer,
}: Props) {
  const palette = txPalette(tone);
  const insets = useSafeAreaInsets();

  const haloScale = useSharedValue(0.6);
  const haloOpacity = useSharedValue(0);
  const checkProgress = useSharedValue(CHECK_LEN);
  const contentOpacity = useSharedValue(0);
  const contentTranslate = useSharedValue(8);

  useEffect(() => {
    haloOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
    haloScale.value = withSpring(1, { damping: 14, mass: 0.8, stiffness: 140 });
    checkProgress.value = withDelay(
      220,
      withTiming(0, { duration: 360, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
    contentOpacity.value = withDelay(380, withTiming(1, { duration: 320 }));
    contentTranslate.value = withDelay(
      380,
      withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: checkProgress.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslate.value }],
  }));

  return (
    <CenterGlow tone={tone}>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: 0,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={onClose ?? onDone}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.035)',
            borderWidth: 1,
            borderColor: palette.hairline,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.close size={22} color={T.ink} strokeWidth={1.6} />
        </Pressable>
      </View>

      <View style={{ paddingTop: 28, alignItems: 'center' }}>
        <Animated.View
          style={[
            {
              width: 140,
              height: 140,
              borderRadius: 70,
              borderWidth: 1.5,
              borderColor: palette.accent,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.02)',
              shadowColor: palette.accentGlow,
              shadowOpacity: 1,
              shadowRadius: 50,
              shadowOffset: { width: 0, height: 0 },
            },
            haloStyle,
          ]}
        >
          <Svg width={60} height={60} viewBox="0 0 60 60" fill="none">
            <Circle
              cx={30}
              cy={30}
              r={27}
              stroke={palette.accent}
              strokeWidth={1}
              opacity={0.3}
            />
            <AnimatedPath
              d={CHECK_PATH}
              stroke={palette.accent}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={CHECK_LEN}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          {
            paddingTop: 28,
            paddingHorizontal: 28,
            alignItems: 'center',
          },
          contentStyle,
        ]}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 10,
              letterSpacing: 3.2,
              textTransform: 'uppercase',
              color: palette.accent,
              fontWeight: '700',
              marginBottom: 14,
            },
          ]}
        >
          {kicker}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }}>
          {prefix ? (
            <Text
              style={[
                serif,
                {
                  fontSize: 24,
                  color: palette.accent,
                  fontStyle: 'italic',
                  lineHeight: 24,
                  includeFontPadding: false,
                  marginRight: 2,
                },
              ]}
            >
              {prefix}
            </Text>
          ) : null}
          <Text
            style={[
              sansationLight,
              {
                fontSize: 56,
                letterSpacing: -1.68,
                color: palette.ink,
                lineHeight: 56,
                includeFontPadding: false,
              },
            ]}
          >
            {amount}
          </Text>
        </View>
        {subtitle ? (
          <Text
            style={[
              serif,
              {
                fontSize: 16,
                fontStyle: 'italic',
                color: palette.inkDim,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>

      <View style={{ flex: 1 }} />

      <Animated.View
        style={[
          {
            paddingHorizontal: 28,
            paddingBottom: insets.bottom + 16,
            gap: 10,
          },
          contentStyle,
        ]}
      >
        <Pressable
          onPress={onViewExplorer}
          accessibilityRole="button"
          accessibilityLabel="View on explorer"
          style={{
            paddingVertical: 12,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderWidth: 1,
            borderColor: palette.hairline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icons.arrUpRight size={14} color={palette.ink} />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                color: palette.ink,
                fontWeight: '600',
              },
            ]}
          >
            View on explorer
          </Text>
        </Pressable>

        <Pressable
          onPress={onNewTransfer}
          accessibilityRole="button"
          accessibilityLabel="Make new transfer"
          style={{
            paddingVertical: 14,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: palette.accentDim,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              sansationBold,
              {
                fontSize: 11,
                letterSpacing: 2.64,
                textTransform: 'uppercase',
                color: palette.accent,
              },
            ]}
          >
            Make new transfer
          </Text>
        </Pressable>

        <PillBtn
          variant="primary"
          tone={tone}
          label="Done"
          onPress={onDone}
        />
      </Animated.View>
    </CenterGlow>
  );
}
