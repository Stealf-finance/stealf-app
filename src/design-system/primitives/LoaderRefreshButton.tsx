import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

type Props = {
  onPress: () => void;
  /** While true, the loader spins continuously (background fetch in flight). */
  spinning?: boolean;
  size?: number;
  color?: string;
};

/** A refresh control rendered as the two-arc `loader` glyph. Spins once on tap
 *  and keeps spinning while `spinning` is true. */
export function LoaderRefreshButton({
  onPress,
  spinning = false,
  size = 28,
  color = T.gold,
}: Props) {
  const angle = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // Continuous spin while a fetch is in flight; when it stops, settle onto the
  // next full-turn boundary so it always completes a whole rotation.
  useEffect(() => {
    if (spinning) {
      angle.set(
        withRepeat(
          withTiming(angle.get() + 360, {
            duration: 900,
            easing: Easing.linear,
          }),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(angle);
      const fullTurn = Math.ceil(angle.get() / 360) * 360;
      angle.set(
        withTiming(fullTurn, {
          duration: 350,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [spinning, angle]);

  const handlePress = () => {
    pressScale.set(
      withTiming(0.85, { duration: 90 }, () => {
        pressScale.value = withTiming(1, { duration: 180 });
      }),
    );
    // One full turn on tap, landing exactly on a 360° boundary (so it always
    // reads as a complete rotation, even if the refetch resolves instantly).
    const target = (Math.round(angle.get() / 360) + 1) * 360;
    angle.set(
      withTiming(target, {
        duration: 650,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    onPress();
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }, { rotate: `${angle.value}deg` }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Refresh"
      hitSlop={10}
    >
      <Animated.View style={style}>
        <Icons.loader size={size} color={color} strokeWidth={1.6} />
      </Animated.View>
    </Pressable>
  );
}
