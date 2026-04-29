import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
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
import { CodeInput } from './components/CodeInput';
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

  const inviteValid = useMemo(() => isValidInvite(state.invite), [state.invite]);
  const handleValid = useMemo(() => isValidHandle(state.handle), [state.handle]);
  const emailValid = useMemo(() => isValidEmail(state.email), [state.email]);

  const onSubmitInvite = async () => {
    const r = await signUp.submitInvite();
    if (!r.ok && __DEV__) console.warn('[OnboardWizard] invite failed:', r.message);
  };
  const onSubmitHandle = async () => {
    const r = await signUp.submitHandle();
    if (!r.ok && __DEV__) console.warn('[OnboardWizard] handle failed:', r.message);
  };
  const onSubmitEmail = async () => {
    const r = await signUp.submitEmail();
    if (!r.ok && __DEV__) console.warn('[OnboardWizard] email failed:', r.message);
  };
  const onSubmitCode = async () => {
    const r = await signUp.submitCode();
    if (!r.ok && __DEV__) console.warn('[OnboardWizard] code failed:', r.message);
  };

  const onEnablePasskey = async () => {
    // If a previous attempt failed retryably, purge orphan Turnkey state first.
    const purgeFirst = state.errorRetryable && !!state.error;
    const result = await signUp.createPasskey({ purgeFirst });
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
          label: state.loading ? 'Checking…' : 'Continue',
          variant: 'primary',
          tone: 'silver',
          disabled: !inviteValid || state.loading,
          onPress: onSubmitInvite,
        }
      : state.step === 'handle'
        ? {
            label: state.loading ? 'Saving…' : 'Continue',
            variant: 'primary',
            tone: 'silver',
            disabled: !handleValid || state.loading,
            onPress: onSubmitHandle,
          }
        : state.step === 'email'
          ? {
              label: state.loading ? 'Sending…' : 'Send code',
              variant: 'primary',
              tone: 'silver',
              disabled: !emailValid || state.loading,
              onPress: onSubmitEmail,
            }
          : state.step === 'verifying'
            ? {
                label: state.loading ? 'Verifying…' : 'Verify',
                variant: 'primary',
                tone: 'silver',
                disabled: state.codeDigits.length !== 6 || state.loading,
                onPress: onSubmitCode,
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
            title="Enter your code"
            subtitle={`We just sent a 6-digit code to ${state.email}`}
          >
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 12,
              }}
            >
              <CodeInput
                value={state.codeDigits}
                onChange={signUp.setCodeDigits}
                onSubmit={onSubmitCode}
                disabled={state.loading}
                errored={state.codeError != null}
              />
              <Text
                style={{
                  marginTop: 28,
                  fontSize: 12,
                  color: S.inkFaint,
                  textAlign: 'center',
                  lineHeight: 19,
                }}
              >
                The code expires in{' '}
                <Text style={{ color: S.ink }}>10 minutes</Text>.{'\n'}
                Didn&apos;t get it?{' '}
                {state.resendCooldown > 0 ? (
                  <Text style={{ color: S.inkDim }}>
                    Resend in {state.resendCooldown}s
                  </Text>
                ) : (
                  <Text
                    style={{
                      color: S.accent,
                      textDecorationLine: 'underline',
                    }}
                    onPress={() => {
                      void signUp.resendCode();
                    }}
                  >
                    Resend
                  </Text>
                )}
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
      <Image
        source={require('@/assets/images/passkey.png')}
        style={{ width: 80, height: 80 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
