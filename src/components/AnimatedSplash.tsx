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
import { LoaderDots } from '@/src/design-system/primitives/LoaderDots';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

const SILVER = txPalette('silver');

export function AnimatedSplash() {
  const { isLoading } = useAuth();
  const [done, setDone] = useState(false);
  const hasRunRef = useRef(false);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const loaderOpacity = useSharedValue(1);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));

  useEffect(() => {
    if (isLoading || hasRunRef.current) return;
    hasRunRef.current = true;

    // Loader fades out first so the logo takes the stage.
    loaderOpacity.value = withTiming(0, { duration: 200 });

    // Then the logo lunges forward + the whole splash fades out.
    scale.value = withDelay(
      120,
      withTiming(1.6, {
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
  }, [isLoading, scale, opacity, loaderOpacity]);

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
      <Animated.View style={logoStyle}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={{ width: 200, height: 200 }}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 140,
          },
          loaderStyle,
        ]}
      >
        <LoaderDots color={SILVER.accent} size={9} bounce={9} />
      </Animated.View>
    </Animated.View>
  );
}
