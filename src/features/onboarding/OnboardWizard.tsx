import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { StepBar } from '@/src/design-system/primitives/StepBar';
import { UnderlineField } from '@/src/design-system/primitives/UnderlineField';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSignUp } from './hooks/useSignUp';
import { useEmailVerificationPolling } from './hooks/useEmailVerificationPolling';
import type { SignUpStep } from './lib/signUpReducer';

const S = txPalette('silver');
const G = txPalette('gold');
const SOLANA_GREEN = '#14F195';
const TOTAL_STEPS = 5;

const isValidInvite = (v: string) => v.trim().length >= 4;
const isValidHandle = (v: string) => /^[a-zA-Z0-9_]{3,20}$/.test(v.trim());
const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const FADE_OUT = 160;
const FADE_IN = 220;

const STEP_INDEX: Record<SignUpStep, number> = {
  invite: 0,
  handle: 1,
  email: 2,
  verifying: 3,
  passkey: 4,
  done: 4,
};

const STEP_BACK: Record<SignUpStep, SignUpStep | null> = {
  invite: null,
  handle: 'invite',
  email: 'handle',
  verifying: 'email',
  passkey: 'verifying',
  done: 'passkey',
};

type Props = {
  onExitBack: () => void;
};

export function OnboardWizard({ onExitBack }: Props) {
  const insets = useSafeAreaInsets();
  const signUp = useSignUp();
  const { state, setInvite, setHandle, setEmail, setTermsAccepted, goto } = signUp;

  const visualStep = STEP_INDEX[state.step];
  const [renderedStep, setRenderedStep] = useState(visualStep);

  const opacity = useSharedValue(1);
  const translate = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  const animateTo = useCallback(
    (next: number, direction: 'forward' | 'back') => {
      if (next === renderedStep) return;
      const sign = direction === 'forward' ? -1 : 1;
      opacity.value = withTiming(0, { duration: FADE_OUT });
      translate.value = withTiming(8 * sign, { duration: FADE_OUT }, (done) => {
        if (!done) return;
        runOnJS(setRenderedStep)(next);
        translate.value = -8 * sign;
        opacity.value = withTiming(1, { duration: FADE_IN });
        translate.value = withTiming(0, { duration: FADE_IN });
      });
    },
    [renderedStep, opacity, translate],
  );

  // Sync visual step with reducer step. Direction is inferred from delta.
  const lastStepRef = useRef(visualStep);
  useEffect(() => {
    if (visualStep === lastStepRef.current) return;
    const direction = visualStep > lastStepRef.current ? 'forward' : 'back';
    lastStepRef.current = visualStep;
    animateTo(visualStep, direction);
  }, [visualStep, animateTo]);

  const handleBack = () => {
    const prev = STEP_BACK[state.step];
    if (!prev) {
      onExitBack();
      return;
    }
    goto(prev);
  };

  useEmailVerificationPolling({
    preAuthToken: state.preAuthToken,
    enabled: state.step === 'verifying',
    onVerified: signUp.onEmailVerified,
  });

  const inviteValid = useMemo(() => isValidInvite(state.invite), [state.invite]);
  const handleValid = useMemo(() => isValidHandle(state.handle), [state.handle]);
  const emailValid = useMemo(() => isValidEmail(state.email), [state.email]);

  const openMail = () => {
    Linking.openURL('message://').catch(() => {
      Linking.openURL('mailto:').catch(() => {});
    });
  };

  const onSendMagicLink = async () => {
    const result = await signUp.startVerification();
    if (!result.ok && __DEV__) console.warn('[OnboardWizard] verification failed:', result.message);
  };

  const onEnablePasskey = async () => {
    const result = await signUp.createPasskey();
    if (!result.ok && __DEV__) console.warn('[OnboardWizard] passkey failed:', result.message);
    // On success, AuthGuard redirects automatically; nothing to do here.
  };

  type Cta = {
    label: string;
    variant: 'primary' | 'secondary';
    tone: 'silver' | 'gold';
    disabled: boolean;
    onPress: () => void;
  };

  const cta: Cta =
    state.step === 'invite'
      ? {
          label: 'Continue',
          variant: 'primary',
          tone: 'silver',
          disabled: !inviteValid,
          onPress: () => goto('handle'),
        }
      : state.step === 'handle'
        ? {
            label: 'Continue',
            variant: 'primary',
            tone: 'silver',
            disabled: !handleValid,
            onPress: () => goto('email'),
          }
        : state.step === 'email'
          ? {
              label: state.loading ? 'Sending…' : 'Send magic link',
              variant: 'primary',
              tone: 'silver',
              disabled: !emailValid || state.loading,
              onPress: onSendMagicLink,
            }
          : state.step === 'verifying'
            ? {
                label: 'Open email app',
                variant: 'secondary',
                tone: 'silver',
                disabled: false,
                onPress: openMail,
              }
            : {
                label: state.loading ? 'Activating…' : 'Enable Passkey',
                variant: 'primary',
                tone: 'gold',
                disabled: !state.termsAccepted || state.loading || !signUp.isClientReady,
                onPress: onEnablePasskey,
              };

  return (
    <View style={{ flex: 1 }}>
      {/* Fixed header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackBtn onPress={handleBack} />
        <StepBar current={renderedStep} total={TOTAL_STEPS} />
        <View style={{ width: 36 }} />
      </View>

      {/* Animated content */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 144,
            left: 0,
            right: 0,
            bottom: 140,
            paddingHorizontal: 28,
          },
          animatedStyle,
        ]}
      >
        {renderedStep === 0 && (
          <StepBlock
            kicker="Invite only"
            title="Enter your code"
            subtitle="Stealf is invitation-based for now."
          >
            <UnderlineField
              value={state.invite}
              onChangeText={(v) => setInvite(v.toUpperCase())}
              placeholder="your invite code"
              autoCapitalize="characters"
              rightSlot={
                inviteValid ? (
                  <Icons.check size={18} color={SOLANA_GREEN} />
                ) : null
              }
            />
            <Text
              style={{
                marginTop: 14,
                fontSize: 12,
                color: S.inkFaint,
                textAlign: 'center',
                lineHeight: 18,
              }}
            >
              Don&apos;t have a code?{' '}
              <Text
                style={{ color: S.accent, textDecorationLine: 'underline' }}
                onPress={() => {}}
              >
                Join the waitlist
              </Text>
            </Text>
          </StepBlock>
        )}

        {renderedStep === 1 && (
          <StepBlock
            kicker="Choose your handle"
            title="Pick a name"
            subtitle="This is how people find you on Stealf."
          >
            <UnderlineField
              value={state.handle}
              onChangeText={(v) => setHandle(v.replace(/\s/g, ''))}
              placeholder="username"
              prefix="@"
              autoCapitalize="none"
              rightSlot={
                handleValid ? (
                  <Icons.check size={18} color={SOLANA_GREEN} />
                ) : null
              }
            />
            <Text
              style={{
                marginTop: 12,
                fontSize: 11,
                color: S.inkFaint,
                lineHeight: 17,
                opacity: 0.7,
              }}
            >
              3–20 characters · letters, numbers, underscore.
            </Text>
          </StepBlock>
        )}

        {renderedStep === 2 && (
          <StepBlock
            kicker="Verify your email"
            title="Your email"
            subtitle="We'll send a magic link to sign you in."
          >
            <UnderlineField
              value={state.email}
              onChangeText={(v) => setEmail(v.trim())}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              rightSlot={
                emailValid ? (
                  <Icons.check size={18} color={SOLANA_GREEN} />
                ) : null
              }
            />
            <Text
              style={{
                marginTop: 14,
                fontSize: 12,
                color: S.inkFaint,
                textAlign: 'center',
                lineHeight: 18,
              }}
            >
              We&apos;ll never share or sell your email.
            </Text>
          </StepBlock>
        )}

        {renderedStep === 3 && (
          <StepBlock
            kicker="Almost there"
            title="Check your inbox"
            subtitle={`We just sent a magic link to ${state.email}`}
          >
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
            >
              <EnvelopeSeal />
              <Text
                style={{
                  marginTop: 36,
                  fontSize: 12,
                  color: S.inkFaint,
                  textAlign: 'center',
                  lineHeight: 19,
                }}
              >
                The link expires in{' '}
                <Text style={{ color: S.ink }}>10 minutes</Text>.{'\n'}
                Didn&apos;t get it?{' '}
                <Text
                  style={{
                    color: S.accent,
                    textDecorationLine: 'underline',
                  }}
                  onPress={() => {
                    void signUp.resendMagicLink();
                  }}
                >
                  Resend
                </Text>
              </Text>
            </View>
          </StepBlock>
        )}

        {renderedStep === 4 && (
          <StepBlock
            kicker="Secure your account"
            title="Set up Passkey"
            subtitle="Sign in instantly with your face — no password."
          >
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
            >
              <FaceIdGlyph />
            </View>
          </StepBlock>
        )}
      </Animated.View>

      {/* CTA — fades with content but stays positioned */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 56,
            paddingHorizontal: 28,
          },
          animatedStyle,
        ]}
      >
        {renderedStep === 4 ? (
          <TermsCheckbox
            checked={state.termsAccepted}
            onToggle={() => setTermsAccepted(!state.termsAccepted)}
          />
        ) : null}
        {state.error ? (
          <Text
            style={{
              fontSize: 12,
              color: '#E5484D',
              textAlign: 'center',
              marginBottom: 12,
              paddingHorizontal: 8,
            }}
          >
            {state.error}
          </Text>
        ) : null}
        <PillBtn
          variant={cta.variant}
          tone={cta.tone}
          label={cta.label}
          disabled={cta.disabled}
          onPress={cta.onPress}
        />
      </Animated.View>
    </View>
  );
}

type StepBlockProps = {
  kicker: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

function StepBlock({ kicker, title, subtitle, children }: StepBlockProps) {
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <View style={{ width: 18, height: 1, backgroundColor: S.accentDim }} />
        <Text
          style={[
            sansation,
            {
              fontSize: 10,
              letterSpacing: 3.2,
              textTransform: 'uppercase',
              color: S.accent,
              fontWeight: '700',
            },
          ]}
        >
          {kicker}
        </Text>
        <View style={{ width: 18, height: 1, backgroundColor: S.accentDim }} />
      </View>

      <Text
        style={[
          sansationLight,
          {
            fontSize: 32,
            lineHeight: 36,
            letterSpacing: -0.96,
            color: T.ink,
            textAlign: 'center',
            marginBottom: 10,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          serif,
          {
            fontSize: 16,
            lineHeight: 22,
            color: S.accent,
            textAlign: 'center',
            marginBottom: 32,
          },
        ]}
      >
        {subtitle}
      </Text>

      <View style={{ flex: 1, marginTop: 8 }}>{children}</View>
    </>
  );
}

function EnvelopeSeal() {
  return (
    <View
      style={{
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 1,
        borderColor: S.hairline,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#dcdcdf',
        shadowOpacity: 0.18,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
      <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
        {/* envelope */}
        <Rect
          x={10}
          y={22}
          width={60}
          height={42}
          rx={4}
          stroke={S.accent}
          strokeWidth={1.2}
          fill="rgba(255,255,255,0.03)"
        />
        <Path
          d="M10 26 L40 46 L70 26"
          stroke={S.accent}
          strokeWidth={1.2}
          fill="none"
        />
        {/* wax seal */}
        <Circle cx={40} cy={44} r={10} fill={T.gold} opacity={0.9} />
        <Circle
          cx={40}
          cy={44}
          r={10}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={0.8}
        />
        <SvgText
          x={40}
          y={48}
          textAnchor="middle"
          fill="#1a1a1a"
          fontSize={12}
          fontWeight="700"
          fontFamily="Cormorant Garamond"
          fontStyle="italic"
        >
          s
        </SvgText>
        {/* sparkles */}
        <Circle cx={22} cy={12} r={1.5} fill={S.accent} />
        <Circle cx={62} cy={10} r={1} fill={S.accent} opacity={0.6} />
        <Circle cx={70} cy={68} r={1} fill={S.accent} opacity={0.5} />
        <Circle cx={14} cy={70} r={1.5} fill={S.accent} opacity={0.7} />
      </Svg>
    </View>
  );
}

type TermsCheckboxProps = {
  checked: boolean;
  onToggle: () => void;
};

function TermsCheckbox({ checked, onToggle }: TermsCheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="Accept terms and privacy policy"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        marginBottom: 4,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: checked ? G.accent : S.hairline,
          backgroundColor: checked ? G.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icons.check size={12} color={T.bg} /> : null}
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 12,
          lineHeight: 17,
          color: S.inkFaint,
        }}
      >
        I accept the{' '}
        <Text style={{ color: S.accent, textDecorationLine: 'underline' }}>
          Terms
        </Text>
        {' & '}
        <Text style={{ color: S.accent, textDecorationLine: 'underline' }}>
          Privacy Policy
        </Text>
        .
      </Text>
    </Pressable>
  );
}

function FaceIdGlyph() {
  const cornerSize = 22;
  const cornerWidth = 2.5;
  const corner = (
    pos: 'tl' | 'tr' | 'bl' | 'br',
  ): import('react-native').ViewStyle => {
    const base: import('react-native').ViewStyle = {
      position: 'absolute',
      width: cornerSize,
      height: cornerSize,
      borderColor: T.gold,
    };
    if (pos === 'tl')
      return {
        ...base,
        top: -2,
        left: -2,
        borderTopWidth: cornerWidth,
        borderLeftWidth: cornerWidth,
        borderTopLeftRadius: 28,
      };
    if (pos === 'tr')
      return {
        ...base,
        top: -2,
        right: -2,
        borderTopWidth: cornerWidth,
        borderRightWidth: cornerWidth,
        borderTopRightRadius: 28,
      };
    if (pos === 'bl')
      return {
        ...base,
        bottom: -2,
        left: -2,
        borderBottomWidth: cornerWidth,
        borderLeftWidth: cornerWidth,
        borderBottomLeftRadius: 28,
      };
    return {
      ...base,
      bottom: -2,
      right: -2,
      borderBottomWidth: cornerWidth,
      borderRightWidth: cornerWidth,
      borderBottomRightRadius: 28,
    };
  };

  return (
    <View
      style={{
        width: 140,
        height: 140,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: G.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: G.accentGlow,
        shadowOpacity: 1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <View style={corner('tl')} />
      <View style={corner('tr')} />
      <View style={corner('bl')} />
      <View style={corner('br')} />
      <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
        <Path
          d="M25 30 Q40 18 55 30 L55 52 Q40 62 25 52 Z"
          stroke={G.accent}
          strokeWidth={1.4}
          fill="none"
          opacity={0.7}
        />
        <Circle cx={32} cy={38} r={1.5} fill={G.accent} />
        <Circle cx={48} cy={38} r={1.5} fill={G.accent} />
        <Path
          d="M40 40 L40 46 L42 48"
          stroke={G.accent}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M33 52 Q40 55 47 52"
          stroke={G.accent}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
