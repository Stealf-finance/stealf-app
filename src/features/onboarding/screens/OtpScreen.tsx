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

  const [otpId, setOtpId] = useState(initialOtpId);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onSubmit = async () => {
    if (code.length !== 6 || isLoading) return;
    setError(null);
    try {
      await verifyEmailCode(otpId, code, email);
      // AuthGuard handles routing once setUser fires.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
      setCode('');
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setError(null);
    try {
      const r = await resendEmailCode(email);
      setOtpId(r.otpId);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
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
            errored={error != null}
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

        <FormError message={error} />
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
