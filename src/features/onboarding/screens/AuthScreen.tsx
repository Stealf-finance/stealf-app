import { useEffect } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBtn } from '@/src/design-system/primitives/AuthBtn';
import { AppleGlyph, GoogleGlyph, MailGlyph } from '@/src/design-system/icons/auth';
import { sansation, sansationBold } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { useToast } from '@/src/components/toast/ToastContext';

type Props = {
  onEmail: () => void;
};

export function AuthScreen({ onEmail }: Props) {
  const insets = useSafeAreaInsets();
  const { show: showToast } = useToast();
  const {
    signInWithGoogle,
    signInWithApple,
    isAuthenticating,
    pendingProvider,
    error,
  } = useAuthFlow();

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
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Hero — full-bleed city backdrop with the logo, fading into the dark
          auth section below so the two halves blend (no hard cut). */}
      <View style={{ flex: 1 }}>
        <Image
          source={require('@/assets/images/fond.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {/* Subtle scrim — adds mood and keeps the white logo legible. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(8,8,10,0.18)' },
          ]}
        />
        {/* Bottom fade — melts the image into T.bg toward the auth section. */}
        <LinearGradient
          colors={['transparent', 'transparent', T.bg]}
          locations={[0, 0.58, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Logo + beta, centered over the image */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top,
          }}
        >
          <View style={{ width: 280, height: 280 }}>
            <Image
              source={require('@/assets/images/logo-transparent.png')}
              style={{ width: 280, height: 280 }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            {/* Pinned to the glyph's bottom-right (the glyph sits centered in
                the PNG's transparent padding, hence the large offsets). */}
            <Text
              style={[
                sansationBold,
                {
                  position: 'absolute',
                  right: 60,
                  bottom: 88,
                  fontSize: 17,
                  letterSpacing: 0.5,
                  color: 'rgba(255,255,255,0.92)',
                  includeFontPadding: false,
                },
              ]}
            >
              beta
            </Text>
          </View>
        </View>
      </View>

      {/* Auth options — on the dark section the hero fades into. */}
      <View
        style={{
          paddingHorizontal: 28,
          paddingBottom: insets.bottom + 24,
          gap: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 4,
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

        {/* On Apple devices, Apple is the prominent (white) option; Google
            steps back to glass so there's a single primary button. */}
        {Platform.OS === 'ios' && (
          <AuthBtn
            variant="primary"
            icon={<AppleGlyph size={18} color={T.bg} />}
            label="Continue with Apple"
            disabled={disabled}
            loading={pendingProvider === 'apple'}
            onPress={onApple}
          />
        )}
        <AuthBtn
          variant={Platform.OS === 'ios' ? 'glass' : 'primary'}
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
              marginTop: 8,
              fontSize: 11,
              lineHeight: 17,
              color: T.inkFaint,
              textAlign: 'center',
            },
          ]}
        >
          By continuing you agree to our{'\n'}
          <Text
            onPress={() => void Linking.openURL('https://stealf.xyz/terms')}
            style={{ color: T.inkDim, textDecorationLine: 'underline' }}
          >
            Terms
          </Text>
          {' · '}
          <Text
            onPress={() => void Linking.openURL('https://stealf.xyz/privacy')}
            style={{ color: T.inkDim, textDecorationLine: 'underline' }}
          >
            Privacy
          </Text>
        </Text>
      </View>
    </View>
  );
}
