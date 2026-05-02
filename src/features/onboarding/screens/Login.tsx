import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { sansationLight, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSignIn } from '../hooks/useSignIn';

const S = txPalette('silver');
const G = txPalette('gold');

type Props = {
  handle?: string;
  onBack: () => void;
  /** Called once the auth state is settled. Routing is handled by AuthGuard. */
  onSuccess?: () => void;
};

export function Login({ handle = '@thomas', onBack, onSuccess }: Props) {
  const { signInAsync, isLoading, isClientReady, error } = useSignIn();

  const handleSignIn = async () => {
    try {
      await signInAsync();
      onSuccess?.();
    } catch (err) {
      if (__DEV__) console.warn('[Login] sign-in failed:', err);
    }
  };
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.5 * pulse.value,
    transform: [{ scale: 1 + 0.06 * pulse.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackBtn onPress={onBack} />
        <View style={{ flex: 1 }} />
        <View style={{ width: 36 }} />
      </View>

      {/* Centered hero */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Text
          style={[
            sansationLight,
            {
              fontSize: 36,
              lineHeight: 42,
              letterSpacing: -1.08,
              color: T.ink,
              textAlign: 'center',
            },
          ]}
        >
          Welcome back
        </Text>

        <Text
          style={[
            serif,
            {
              fontSize: 24,
              lineHeight: 30,
              color: S.accent,
              letterSpacing: -0.24,
              marginTop: 6,
              textAlign: 'center',
            },
          ]}
        >
          {handle}
        </Text>

        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 64,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: 110,
                height: 110,
                borderRadius: 24,
                shadowColor: G.accentGlow,
                shadowOpacity: 1,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 0 },
              },
              haloStyle,
            ]}
          />
          <Pressable
            onPress={handleSignIn}
            disabled={isLoading || !isClientReady}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Face ID"
            accessibilityState={{ disabled: isLoading || !isClientReady, busy: isLoading }}
            style={{
              width: 110,
              height: 110,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: G.accent,
              backgroundColor: 'rgba(201,168,106,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading || !isClientReady ? 0.5 : 1,
            }}
          >
            <Image
              source={require('@/assets/images/passkey.png')}
              style={{ width: 64, height: 64 }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </Pressable>
        </View>

        <Text
          style={{
            marginTop: 22,
            fontSize: 13,
            color: S.inkDim,
            textAlign: 'center',
          }}
        >
          {isLoading
            ? 'Authenticating…'
            : !isClientReady
              ? 'Initializing…'
              : 'Look at your phone to sign in'}
        </Text>

        {error ? (
          <Text
            style={{
              marginTop: 14,
              fontSize: 12,
              color: '#E5484D',
              textAlign: 'center',
              paddingHorizontal: 24,
            }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
