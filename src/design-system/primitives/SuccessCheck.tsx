import { useEffect } from 'react';
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
import { txPalette, type Tone } from '@/src/design-system/palettes';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_PATH = 'M18 30 L26 38 L42 22';
const CHECK_LEN = 36;

/** The animated success badge — halo springs in, then the checkmark draws
 *  itself. Shared by every confirmation sheet so they celebrate identically. */
export function SuccessCheck({ tone }: { tone: Tone }) {
  const palette = txPalette(tone);
  const haloScale = useSharedValue(0.6);
  const haloOpacity = useSharedValue(0);
  const checkProgress = useSharedValue(CHECK_LEN);

  useEffect(() => {
    haloOpacity.set(
      withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.quad),
      }),
    );
    haloScale.set(withSpring(1, { damping: 14, mass: 0.8, stiffness: 140 }));
    checkProgress.set(
      withDelay(
        220,
        withTiming(0, {
          duration: 360,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        }),
      ),
    );
  }, [checkProgress, haloOpacity, haloScale]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: checkProgress.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 104,
          height: 104,
          borderRadius: 52,
          borderWidth: 1.5,
          borderColor: palette.accent,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.02)',
          shadowColor: palette.accentGlow,
          shadowOpacity: 1,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 0 },
        },
        haloStyle,
      ]}
    >
      <Svg width={56} height={56} viewBox="0 0 60 60" fill="none">
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
  );
}
