import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StepFrame } from '@/src/design-system/primitives/StepFrame';
import { Field } from '@/src/design-system/primitives/Field';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { sansationBold, mono } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

export function InviteCode() {
  const router = useRouter();
  const [code, setCode] = useState('STEALF-A7X9K');

  return (
    <StepFrame
      back
      step={0}
      totalSteps={4}
      kicker="Invite only"
      title="Enter your code"
      subtitle="Stealf is invitation-based for now."
      bottom={
        <PillBtn
          variant="primary"
          tone="silver"
          label="Continue"
          onPress={() => router.push('/(auth)/handle')}
        />
      }
    >
      <View style={{ marginTop: 8 }}>
        <Field
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          inputStyle={[mono, { fontSize: 16, letterSpacing: 1.6 }]}
          rightSlot={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Paste"
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 100,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: S.hairline,
              }}
            >
              <Text
                style={[
                  sansationBold,
                  {
                    fontSize: 9,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    color: S.accent,
                  },
                ]}
              >
                Paste
              </Text>
            </Pressable>
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
            style={{
              color: S.accent,
              textDecorationLine: 'underline',
            }}
            onPress={() => {}}
          >
            Join the waitlist
          </Text>
        </Text>
      </View>
    </StepFrame>
  );
}
