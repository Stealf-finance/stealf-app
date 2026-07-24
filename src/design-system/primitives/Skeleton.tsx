import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  width: DimensionValue;
  height: number;
  radius?: number;
};

/**
 * Pulsing placeholder bar for loading / not-yet-available data (Revolut-style).
 * Opacity breathes between 0.4 and 1 on a subtle white fill.
 */
export function Skeleton({ width, height, radius = 6 }: Props) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.09)' },
        animatedStyle,
      ]}
    />
  );
}
