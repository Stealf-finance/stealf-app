import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBtn } from '@/src/design-system/primitives/AuthBtn';
import { AppleGlyph, GoogleGlyph, MailGlyph } from '@/src/design-system/icons/auth';
import {
  sansation,
  sansationBold,
  sansationItalic,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { useToast } from '@/src/components/toast/ToastContext';

const SILVER = txPalette('silver');

type Props = {
  onEmail: () => void;
};

export function AuthScreen({ onEmail }: Props) {
  const insets = useSafeAreaInsets();
  const { show: showToast } = useToast();
  const {
    signInWithApple,
    signInWithGoogle,
    isAuthenticating,
    pendingProvider,
    error,
  } = useAuthFlow();

  // OAuth errors raised inside the post-auth effect can't reach the
  // try/catch around signInWith*, so we surface them via a toast as soon as
  // the hook's `error` state changes.
  useEffect(() => {
    if (!error) return;
    showToast({ kind: 'error', title: 'Error', message: error });
  }, [error, showToast]);


  const onApple = () => {
    void signInWithApple();
  };

  const onGoogle = () => {
    void signInWithGoogle();
  };


  const disabled = isAuthenticating;

  return (
    <View style={{ flex: 1 }}>
      {/* Descending halo cloud — Maquette OnbAuth halo */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(241,236,225,0.55)',
          'rgba(241,236,225,0.28)',
          'rgba(241,236,225,0.08)',
          'transparent',
        ]}
        locations={[0, 0.28, 0.55, 0.75]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          top: -180,
          left: -40,
          right: -40,
          height: 620,
        }}
      />

      {/* Hero — logo + wordmark + kicker */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
          paddingTop: insets.top,
        }}
      >
        <Image
          source={require('@/assets/images/logo-transparent.png')}
          style={{ width: 96, height: 96, marginBottom: 18 }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        <Text
          style={[
            sansationItalic,
            {
              fontSize: 80,
              lineHeight: 80,
              color: T.ink,
              letterSpacing: -3.2,
              marginBottom: 12,
              includeFontPadding: false,
            },
          ]}
        >
          stealf
        </Text>
        <Text
          style={[
            sansationBold,
            {
              fontSize: 9,
              letterSpacing: 3.78,
              textTransform: 'uppercase',
              color: SILVER.accent,
            },
          ]}
        >
          Private Banking
        </Text>
      </View>

      {/* Auth options */}
      <View
        style={{
          paddingHorizontal: 28,
          paddingBottom: insets.bottom + 32,
          gap: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 6,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: T.hairline }} />
          <Text
            style={[
              sansationBold,
              {
                fontSize: 9,
                letterSpacing: 2.88,
                textTransform: 'uppercase',
                color: T.inkFaint,
              },
            ]}
          >
            Continue with
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: T.hairline }} />
        </View>

        <AuthBtn
          variant="primary"
          icon={<AppleGlyph size={18} color="#0a0a0a" />}
          label="Continue with Apple"
          disabled={disabled}
          loading={pendingProvider === 'apple'}
          onPress={onApple}
        />
        <AuthBtn
          variant="glass"
          icon={<GoogleGlyph size={18} />}
          label="Continue with Google"
          disabled={disabled}
          loading={pendingProvider === 'google'}
          onPress={onGoogle}
        />
        <AuthBtn
          variant="glass"
          icon={<MailGlyph size={18} color={T.ink} />}
          label="Continue with Email"
          disabled={disabled}
          onPress={onEmail}
        />

        <Text
          style={[
            sansation,
            {
              marginTop: 14,
              fontSize: 11,
              lineHeight: 17,
              color: T.inkFaint,
              textAlign: 'center',
            },
          ]}
        >
          By continuing you agree to our{'\n'}
          <Text style={{ color: T.inkDim, textDecorationLine: 'underline' }}>
            Terms
          </Text>
          {' · '}
          <Text style={{ color: T.inkDim, textDecorationLine: 'underline' }}>
            Privacy
          </Text>
        </Text>
      </View>

    </View>
  );
}

