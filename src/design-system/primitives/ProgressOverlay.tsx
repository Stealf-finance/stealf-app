import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { sansationLight, serif } from '@/src/design-system/typography';
import { txPalette, Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  tone?: Tone;
  label: string;
  sub?: string;
  /**
   * Progress ratio 0..1. Animated smoothly between values. If kept at the
   * same value for >5s, the bar continues to creep slowly via a fallback
   * indeterminate-style trickle (handled by callers — set the value
   * forward periodically even when no real signal is available).
   */
  progress: number;
  blurIntensity?: number;
};

const BAR_WIDTH = 220;
const BAR_HEIGHT = 4;

/**
 * Sibling of `LoaderOverlay` — same blur/typography/palette, but trades
 * the bouncing dots for a smooth horizontal progress bar. Use when the
 * underlying work exposes a quantifiable ratio (e.g. claim scan walking
 * the Umbra Merkle tree leaf-by-leaf).
 */
export function ProgressOverlay({
  tone = 'silver',
  label,
  sub,
  progress,
  blurIntensity = 40,
}: Props) {
  const palette = txPalette(tone);
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(
      Math.min(1, Math.max(0, progress)),
      { duration: 360, easing: Easing.out(Easing.cubic) },
    );
  }, [progress, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(220)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          gap: 18,
          backgroundColor: 'rgba(8,8,10,0.35)',
        }}
      >
        <Text
          style={[
            sansationLight,
            {
              fontSize: 18,
              color: T.ink,
              textAlign: 'center',
              letterSpacing: -0.36,
            },
          ]}
        >
          {label}
        </Text>

        <View
          style={{
            width: BAR_WIDTH,
            height: BAR_HEIGHT,
            borderRadius: BAR_HEIGHT / 2,
            backgroundColor: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              {
                height: BAR_HEIGHT,
                backgroundColor: palette.accent,
                borderRadius: BAR_HEIGHT / 2,
              },
              fillStyle,
            ]}
          />
        </View>

        {sub ? (
          <Text
            style={[
              serif,
              {
                fontSize: 13,
                fontStyle: 'italic',
                color: T.inkDim,
                textAlign: 'center',
                lineHeight: 19,
              },
            ]}
          >
            {sub}
          </Text>
        ) : null}
      </BlurView>
    </Animated.View>
  );
}
