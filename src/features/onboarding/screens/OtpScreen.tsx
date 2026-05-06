import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { StepBar } from '@/src/design-system/primitives/StepBar';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { FormError } from '@/src/design-system/primitives/FormError';
import { CodeInput } from '../components/CodeInput';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
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
  // Field-level error only. Verify failures stay inline next to the
  // 6-digit input ("Invalid code") because the recovery action is to
  // retype. Resend / network failures route through Toast.
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
    <View style={{ flex: 1 }}>
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
        <StepBar current={1} total={2} tone="silver" />
        <View style={{ width: 36 }} />
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 28,
          paddingTop: 36,
        }}
      >
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
            Almost there
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
          Enter your code
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
          We just sent a 6-digit code to {email}
        </Text>

        <View style={{ alignItems: 'center', paddingTop: 8 }}>
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
              marginTop: 28,
              fontSize: 12,
              lineHeight: 19,
              color: T.inkFaint,
              textAlign: 'center',
            },
          ]}
        >
          Didn&apos;t get it?{' '}
          {cooldown > 0 ? (
            <Text style={{ color: T.inkDim }}>
              Resend in {cooldown}s
            </Text>
          ) : (
            <Text
              onPress={onResend}
              style={{ color: S.accent, textDecorationLine: 'underline' }}
            >
              Resend
            </Text>
          )}
        </Text>

        <FormError message={verifyError} />
      </View>

      <View
        style={{
          paddingHorizontal: 28,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <PillBtn
          variant="primary"
          tone="silver"
          label={isLoading ? 'Verifying…' : 'Verify'}
          disabled={code.length !== 6 || isLoading}
          onPress={onSubmit}
        />
      </View>

    </View>
  );
}
