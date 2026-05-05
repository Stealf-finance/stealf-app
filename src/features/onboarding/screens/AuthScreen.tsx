import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
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

      {/* Auth options — glassmorphism card. Mirrors the BlurView+wash
          pattern from Toast / TabBar / CircleIconBtn so this surface
          reads as a peer of the rest of the app, not an outlier. */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: T.hairlineStrong,
            shadowColor: T.shadow,
            shadowOpacity: 0.45,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 40 : 0}
            tint="dark"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor:
                Platform.OS === 'ios'
                  ? 'rgba(12,12,14,0.55)'
                  : 'rgba(12,12,14,0.92)',
            }}
          />

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 20,
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

            {/* Provider hierarchy is platform-conditional. iOS surfaces
                Apple as primary per HIG; Android surfaces Google. We
                hide Apple on Android entirely — Apple Sign-In on
                non-Apple platforms is awkward UX and breaks visual
                hierarchy when shown next to Google. */}
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
      </View>
    </View>
  );
}
