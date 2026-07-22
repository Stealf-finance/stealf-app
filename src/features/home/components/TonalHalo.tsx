import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const STOPS: [number, number, ...number[]] = [0, 0.08, 0.18, 0.28, 0.4, 1];

// Base ramps: silver uses the FAB gradient (#e8e8ea → #9a9a9f); gold matches
// the accent. `intensity` scales the alphas — main screens pass a higher value
// for a pronounced top-to-black gradient; secondary screens use the default.
const SILVER_STOPS: readonly (readonly [string, number])[] = [
  ['232,232,234', 0.18],
  ['232,232,234', 0.14],
  ['198,199,206', 0.08],
  ['168,169,176', 0.04],
  ['154,154,159', 0.018],
  ['154,154,159', 0],
];
const GOLD_STOPS: readonly (readonly [string, number])[] = [
  ['212,175,99', 0.2],
  ['212,175,99', 0.16],
  ['212,175,99', 0.1],
  ['212,175,99', 0.05],
  ['212,175,99', 0.022],
  ['212,175,99', 0],
];

const ramp = (
  stops: readonly (readonly [string, number])[],
  intensity: number,
): [string, string, ...string[]] =>
  stops.map(([rgb, a]) => `rgba(${rgb},${a * intensity})`) as [
    string,
    string,
    ...string[],
  ];

/**
 * Screen-level background halo: a silver wash for Total/Bank/Stealf that
 * cross-fades to gold as the carousel reaches the Encrypted card
 * (progress 2.2 → 3). Changes the actual background, not an overlay on the cards.
 */
export function TonalHalo({
  progress,
  intensity = 1,
}: {
  progress: SharedValue<number>;
  /** Alpha multiplier — main screens bump this for a stronger gradient. */
  intensity?: number;
}) {
  const silver = ramp(SILVER_STOPS, intensity);
  const gold = ramp(GOLD_STOPS, intensity);
  const silverStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1.2, 2], [1, 0], 'clamp'),
  }));
  const goldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1.2, 2], [0, 1], 'clamp'),
  }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, silverStyle]} pointerEvents="none">
        <LinearGradient colors={silver} locations={STOPS} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, goldStyle]} pointerEvents="none">
        <LinearGradient colors={gold} locations={STOPS} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}
