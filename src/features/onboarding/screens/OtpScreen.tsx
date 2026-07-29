import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { FormError } from '@/src/design-system/primitives/FormError';
import { CodeInput } from '../components/CodeInput';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuthFlow } from '../hooks/useAuthFlow';

const S = txPalette('silver');
const RESEND_COOLDOWN_S = 60;

type Props = {
  email: string;
  otpId: string;
  onBack: () => void;
};

export function OtpScreen({ email, otpId: initialOtpId, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { verifyEmailCode, resendEmailCode, isLoading } = useAuthFlow();
  const { show: showToast } = useToast();

  const [otpId, setOtpId] = useState(initialOtpId);

  const [code, setCode] = useState('');

  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onSubmit = async (override?: string) => {
    const submitted = override ?? code;
    if (submitted.length !== 6 || isLoading) return;
    setVerifyError(null);
    try {
      await verifyEmailCode(otpId, submitted, email);
      // AuthGuard handles routing once setUser fires.
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Invalid code');
      setCode('');
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setVerifyError(null);
    try {
      const r = await resendEmailCode(email);
      setOtpId(r.otpId);
      setCooldown(RESEND_COOLDOWN_S);
      showToast({
        kind: 'success',
        title: 'Code sent',
        message: `A new 6-digit code is on its way to ${email}.`,
      });
    } catch (err) {
      showToast({
        kind: 'error',
        title: 'Could not resend',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <CenterGlow tone="silver" flat>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header: bare chevron back (full-screen route → insets.top). */}
        <View
          style={{
            paddingTop: insets.top,
            paddingBottom: 14,
            paddingHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <GlassBackButton onPress={onBack} />
        </View>

        {/* Title + subtitle + code cells */}
        <View style={{ flex: 1, paddingHorizontal: 28 }}>
          <Text
            style={[
              sansationLight,
              {
                fontSize: 30,
                lineHeight: 36,
                letterSpacing: -0.9,
                color: T.ink,
                textAlign: 'center',
                marginTop: 28,
              },
            ]}
          >
            Confirm your email
          </Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 15,
                lineHeight: 21,
                color: T.inkDim,
                textAlign: 'center',
                marginTop: 10,
              },
            ]}
          >
            Please enter the code we sent to{'\n'}
            {email}
          </Text>

          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <CodeInput
              value={code}
              onChange={setCode}
              onSubmit={onSubmit}
              disabled={isLoading}
              errored={verifyError != null}
            />
          </View>

          <Text
            style={[
              sansation,
              {
                marginTop: 24,
                fontSize: 13,
                lineHeight: 19,
                textAlign: 'center',
              },
            ]}
          >
            {cooldown > 0 ? (
              <Text style={{ color: T.inkDim }}>Resend in {cooldown}s</Text>
            ) : (
              <Text
                onPress={onResend}
                style={{ color: S.accent, textDecorationLine: 'underline' }}
              >
                Resend code
              </Text>
            )}
          </Text>

          <FormError message={verifyError} />
        </View>

        {/* Continue — rides above the keyboard via KeyboardAvoidingView. */}
        <View
          style={{
            paddingHorizontal: 28,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <PillBtn
            variant="primary"
            tone="silver"
            label={isLoading ? 'Verifying…' : 'Continue'}
            disabled={code.length !== 6 || isLoading}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </CenterGlow>
  );
}
