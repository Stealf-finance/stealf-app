import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = {
  color?: string;
  size?: number;
  gap?: number;
  bounce?: number;
};

export function LoaderDots({
  color = '#fff',
  size = 10,
  gap = 8,
  bounce = 10,
}: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap,
        height: size + bounce,
      }}
    >
      <BouncingDot delay={0} color={color} size={size} bounce={bounce} />
      <BouncingDot delay={200} color={color} size={size} bounce={bounce} />
      <BouncingDot delay={400} color={color} size={size} bounce={bounce} />
    </View>
  );
}

function BouncingDot({
  delay,
  color,
  size,
  bounce,
}: {
  delay: number;
  color: string;
  size: number;
  bounce: number;
}) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(bounce, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, bounce, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
