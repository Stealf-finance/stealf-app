import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { StepBar } from '@/src/design-system/primitives/StepBar';
import { UnderlineField } from '@/src/design-system/primitives/UnderlineField';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { FormError } from '@/src/design-system/primitives/FormError';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuthFlow } from '../hooks/useAuthFlow';

const S = txPalette('silver');
const SOLANA_GREEN = '#14F195';

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

type Props = {
  onBack: () => void;
  onSent: (email: string, otpId: string) => void;
};

export function EmailEntryScreen({ onBack, onSent }: Props) {
  const insets = useSafeAreaInsets();
  const { sendEmailCode, isLoading } = useAuthFlow();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const valid = isValidEmail(email);

  const onSubmit = async () => {
    if (!valid || isLoading) return;
    setError(null);
    try {
      const trimmed = email.trim();
      const { otpId } = await sendEmailCode(trimmed);
      onSent(trimmed, otpId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
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
        <StepBar current={0} total={2} tone="silver" />
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
            Verify your email
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
          Your email
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
          We&apos;ll send you a 6-digit code to sign in.
        </Text>

        <UnderlineField
          value={email}
          onChangeText={(v) => {
            setEmail(v.trim());
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          tone="silver"
          rightSlot={
            valid ? <Icons.check size={18} color={SOLANA_GREEN} /> : null
          }
        />

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
          label={isLoading ? 'Sending…' : 'Send code'}
          disabled={!valid || isLoading}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}
