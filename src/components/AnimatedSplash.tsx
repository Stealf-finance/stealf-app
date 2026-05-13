import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

export function AnimatedSplash() {
  const { isLoading } = useAuth();
  const [done, setDone] = useState(false);
  const hasRunRef = useRef(false);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (isLoading || hasRunRef.current) return;
    hasRunRef.current = true;

    scale.value = withDelay(
      120,
      withTiming(2.2, {
        duration: 720,
        easing: Easing.out(Easing.cubic),
      }),
    );
    opacity.value = withDelay(
      220,
      withTiming(
        0,
        {
          duration: 580,
          easing: Easing.out(Easing.ease),
        },
        (finished) => {
          if (finished) runOnJS(setDone)(true);
        },
      ),
    );
  }, [isLoading, scale, opacity]);

  if (done) return null;

  return (
    <Animated.View
      pointerEvents={isLoading ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: T.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        containerStyle,
      ]}
    >
      <Animated.View style={[logoStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={{ width: 360, height: 360 }}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}
