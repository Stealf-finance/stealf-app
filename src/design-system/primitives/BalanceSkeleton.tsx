import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { T } from '@/src/design-system/tokens';

type Tone = 'silver' | 'gold';

type Props = {
  width?: number;
  height?: number;
  borderRadius?: number;
  tone?: Tone;
};

// Placeholder shown while a balance query is loading. Replaces the
// `balance?.totalUSD ?? 0` fallback that flickered $0.00 → real value on
// cold start. Pattern: isLoading → skeleton, data !== undefined → render
// the real number (including a genuine $0.00).
export function BalanceSkeleton({
  width = 220,
  height = 64,
  borderRadius = 14,
  tone = 'silver',
}: Props) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.75, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading balance"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor:
            tone === 'gold' ? T.goldFaint : T.hairlineStrong,
        },
        style,
      ]}
    />
  );
}
