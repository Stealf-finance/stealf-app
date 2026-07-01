import { Text, View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { sansation } from '@/src/design-system/typography';

/** Recents section. V1 stub — empty state only. A later lot wires raw recent
 *  wallets (no labels) from a local store seeded by outgoing sends. */
export function PayRecents() {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: T.hairline,
        paddingVertical: 28,
        paddingHorizontal: 16,
        alignItems: 'center',
      }}
    >
      <Text
        style={[
          sansation,
          { fontSize: 13, color: T.inkFaint, textAlign: 'center', includeFontPadding: false },
        ]}
      >
        Recent wallets will appear here as you pay.
      </Text>
    </View>
  );
}
