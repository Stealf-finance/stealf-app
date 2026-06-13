import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  onPress: () => void;
  /** While true, the loader spins continuously (background fetch in flight). */
  spinning?: boolean;
  size?: number;
};

/** A refresh control rendered as loader.png. Spins once on tap and keeps
 *  spinning while `spinning` is true. */
export function LoaderRefreshButton({
  onPress,
  spinning = false,
  size = 28,
}: Props) {
  const angle = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // Continuous spin while a fetch is in flight; when it stops, settle onto the
  // next full-turn boundary so it always completes a whole rotation.
  useEffect(() => {
    if (spinning) {
      angle.value = withRepeat(
        withTiming(angle.value + 360, {
          duration: 900,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    } else {
      cancelAnimation(angle);
      const fullTurn = Math.ceil(angle.value / 360) * 360;
      angle.value = withTiming(fullTurn, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [spinning, angle]);

  const handlePress = () => {
    pressScale.value = withTiming(0.85, { duration: 90 }, () => {
      pressScale.value = withTiming(1, { duration: 180 });
    });
    // One full turn on tap, landing exactly on a 360° boundary (so it always
    // reads as a complete rotation, even if the refetch resolves instantly).
    const target = (Math.round(angle.value / 360) + 1) * 360;
    angle.value = withTiming(target, {
      duration: 650,
      easing: Easing.inOut(Easing.cubic),
    });
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
        <Image
          source={require('@/assets/images/loader.png')}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={{ width: size, height: size }}
        />
      </Animated.View>
    </Pressable>
  );
}
