import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const STOPS: [number, number, ...number[]] = [0, 0.08, 0.18, 0.28, 0.4, 1];
const SILVER: [string, string, ...string[]] = [
  'rgba(220,220,225,0.18)',
  'rgba(220,220,225,0.14)',
  'rgba(220,220,225,0.08)',
  'rgba(220,220,225,0.04)',
  'rgba(220,220,225,0.018)',
  'rgba(220,220,225,0)',
];
const GOLD: [string, string, ...string[]] = [
  'rgba(212,175,99,0.2)',
  'rgba(212,175,99,0.16)',
  'rgba(212,175,99,0.1)',
  'rgba(212,175,99,0.05)',
  'rgba(212,175,99,0.022)',
  'rgba(212,175,99,0)',
];

/**
 * Screen-level background halo: a silver wash for Total/Bank/Stealf that
 * cross-fades to gold as the carousel reaches the Encrypted card
 * (progress 2.2 → 3). Changes the actual background, not an overlay on the cards.
 */
export function TonalHalo({ progress }: { progress: SharedValue<number> }) {
  const silverStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1.2, 2], [1, 0], 'clamp'),
  }));
  const goldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1.2, 2], [0, 1], 'clamp'),
  }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, silverStyle]} pointerEvents="none">
        <LinearGradient colors={SILVER} locations={STOPS} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, goldStyle]} pointerEvents="none">
        <LinearGradient colors={GOLD} locations={STOPS} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}
