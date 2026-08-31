/**
 * Prompt row on Private Balance: nudges the user to move funds out of the
 * public balance and into the encrypted one. Taps into /shield.
 */
import { View } from 'react-native';
import { OutlinedRow } from '@/src/design-system/primitives/OutlinedRow';
import { Icons } from '@/src/design-system/icons';
import { txPalette } from '@/src/design-system/palettes';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

const S = txPalette('silver');

export function ShieldPromptRow() {
  const router = useSafeRouter();

  return (
    <OutlinedRow
      onPress={() => router.push('/shield')}
      accessibilityLabel="Start protecting your wealth — shield funds into your private balance"
      icon={
        // An icon disc rather than shield.png, which already sits in this
        // screen's header — repeating it two rows down reads as a duplicate.
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: S.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.shieldFull size={18} color={S.accent} />
        </View>
      }
      title="Start protecting your wealth"
      subtitle="Shield funds into your private balance"
    />
  );
}
