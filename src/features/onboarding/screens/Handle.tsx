import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StepFrame } from '@/src/design-system/primitives/StepFrame';
import { UnderlineField } from '@/src/design-system/primitives/UnderlineField';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');
const SOLANA_GREEN = '#14F195';

export function Handle() {
  const router = useRouter();
  const [handle, setHandle] = useState('test123tt');

  return (
    <StepFrame
      back
      step={1}
      totalSteps={4}
      kicker="Choose your handle"
      title="Pick a name"
      subtitle="This is how people find you on Stealf."
      bottom={
        <PillBtn
          variant="primary"
          tone="silver"
          label="Continue"
          onPress={() => router.push('/(auth)/email')}
        />
      }
    >
      <View style={{ marginTop: 8 }}>
        <UnderlineField
          value={handle}
          onChangeText={setHandle}
          prefix="@"
          rightSlot={<Icons.check size={18} color={SOLANA_GREEN} />}
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
      </View>
    </StepFrame>
  );
}
