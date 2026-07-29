import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuthFlow } from '../hooks/useAuthFlow';

const S = txPalette('silver');

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

type Props = {
  onBack: () => void;
  onSent: (email: string, otpId: string) => void;
};

export function EmailEntryScreen({ onBack, onSent }: Props) {
  const insets = useSafeAreaInsets();
  const { sendEmailCode, isLoading } = useAuthFlow();
  const { show: showToast } = useToast();

  const [email, setEmail] = useState('');

  const valid = isValidEmail(email);

  const onSubmit = async () => {
    if (!valid || isLoading) return;
    try {
      const trimmed = email.trim();
      const { otpId } = await sendEmailCode(trimmed);
      onSent(trimmed, otpId);
    } catch (err) {
      showToast({
        kind: 'error',
        title: 'Could not send code',
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

        {/* Title + subtitle + input */}
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
            What&apos;s your email?
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
            We&apos;ll send a code to this email{'\n'}to verify your sign in
          </Text>

          {/* Same field as the Send flow's recipient input, for consistency. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginTop: 32,
              paddingVertical: 14,
              paddingHorizontal: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: S.hairline,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <TextInput
              value={email}
              onChangeText={(v) => setEmail(v.trim())}
              onSubmitEditing={onSubmit}
              placeholder="satoshi@mail.com"
              placeholderTextColor={S.inkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              autoFocus
              returnKeyType="go"
              style={[sansation, { flex: 1, padding: 0, color: S.ink, fontSize: 15 }]}
            />
            {valid ? <Icons.check size={18} color={S.accent} /> : null}
          </View>
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
            label={isLoading ? 'Sending…' : 'Continue'}
            disabled={!valid || isLoading}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </CenterGlow>
  );
}
