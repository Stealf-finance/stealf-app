import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StepFrame } from '@/src/design-system/primitives/StepFrame';
import { Field } from '@/src/design-system/primitives/Field';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

export function Email() {
  const router = useRouter();
  const [email, setEmail] = useState('thomas@gagnaire.xyz');

  return (
    <StepFrame
      back
      step={2}
      totalSteps={4}
      kicker="Verify your email"
      title="Your email"
      subtitle="We'll send a magic link to sign you in."
      bottom={
        <PillBtn
          variant="primary"
          tone="silver"
          label="Send magic link"
          onPress={() => router.push('/(auth)/inbox')}
        />
      }
    >
      <View style={{ marginTop: 8 }}>
        <Field
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          leftIcon={<Icons.mail size={18} color={S.accent} />}
          inputStyle={{ fontSize: 16 }}
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
      </View>
    </StepFrame>
  );
}
