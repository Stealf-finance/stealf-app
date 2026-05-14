import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icons } from '@/src/design-system/icons';

const SPIN_DURATION_MS = 1100;
const SPIN_ROTATIONS = 2;
const GOLD = '#e6c079';

type Props = {
  onPress: () => void;
  /** Whether a background fetch is in flight — drives the halo separately
   *  from the finite spin animation. */
  spinning: boolean;
};

export function RefreshBtn({ onPress, spinning }: Props) {
  const angle = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const glow = useSharedValue(0);
  const [localSpinning, setLocalSpinning] = useState(false);

  useEffect(() => {
    glow.value = withTiming(spinning ? 1 : 0, {
      duration: spinning ? 220 : 260,
    });
  }, [spinning, glow]);

  const handlePress = () => {
    pressScale.value = withTiming(0.88, { duration: 90 }, () => {
      pressScale.value = withTiming(1, { duration: 180 });
    });
    setLocalSpinning(true);
    angle.value = 0;
    angle.value = withTiming(
      360 * SPIN_ROTATIONS,
      { duration: SPIN_DURATION_MS, easing: Easing.out(Easing.cubic) },
      () => {
        runOnJS(setLocalSpinning)(false);
      },
    );
    onPress();
  };

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
      { rotate: `${angle.value}deg` },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.85,
    transform: [{ scale: 1 + glow.value * 0.15 }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={localSpinning}
      accessibilityRole="button"
      accessibilityLabel="Refresh"
      hitSlop={10}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(230,192,121,0.10)',
            shadowColor: GOLD,
            shadowOpacity: 1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
          },
          haloStyle,
        ]}
      />
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: 'rgba(230,192,121,0.28)',
          backgroundColor: 'rgba(230,192,121,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View style={rotateStyle}>
          <Icons.refresh size={18} color={GOLD} strokeWidth={2} />
        </Animated.View>
      </View>
    </Pressable>
  );
}
