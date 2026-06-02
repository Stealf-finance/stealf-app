import { useEffect } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { Image } from 'expo-image';
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
    signInWithGoogle,
    isAuthenticating,
    pendingProvider,
    error,
  } = useAuthFlow();

  useEffect(() => {
    if (!error) return;
    showToast({ kind: 'error', title: 'Error', message: error });
  }, [error, showToast]);

  const onApple = () => {
    showToast({
      kind: 'info',
      title: 'Coming soon',
      message: 'Sign in with Apple is coming soon. Use Google or Email for now.',
    });
  };

  const onGoogle = () => {
    void signInWithGoogle();
  };

  const disabled = isAuthenticating;

  return (
    <View style={{ flex: 1 }}>
      {/* Hero — logo + wordmark + kicker. Background tone comes from the
          (auth) layout's <CenterGlow tone="silver">; this screen never
          paints its own halo. */}
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
        {/* Wrapper sizes to the wordmark and stays centered by the parent's
            alignItems; (beta) is absolutely pinned to its bottom-right so the
            title itself never shifts off-center. */}
        <View style={{ marginBottom: 12 }}>
          <Text
            style={[
              sansationItalic,
              {
                fontSize: 80,
                lineHeight: 80,
                color: T.ink,
                letterSpacing: -3.2,
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
                position: 'absolute',
                right: -48,
                bottom: 8,
                fontSize: 12,
                letterSpacing: 1,
                color: SILVER.accent,
                includeFontPadding: false,
              },
            ]}
          >
            (beta)
          </Text>
        </View>
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

      {/* Auth options — flat layout, buttons direct on the (auth) layout's
          CenterGlow background. No container/wash; the Stack route disables
          its fade so AuthFlow's internal animation owns transitions. */}
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

        <AuthBtn
          variant="primary"
          icon={<GoogleGlyph size={18} />}
          label="Continue with Google"
          disabled={disabled}
          loading={pendingProvider === 'google'}
          onPress={onGoogle}
        />
        {Platform.OS === 'ios' && (
          <AuthBtn
            variant="glass"
            icon={<AppleGlyph size={18} color={T.ink} />}
            label="Apple · Coming soon"
            onPress={onApple}
            style={{ opacity: 0.5 }}
          />
        )}
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
