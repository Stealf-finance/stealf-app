// src/features/stealth/screens/PayHub.tsx
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { serif, sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { EncryptedSenderCard } from '@/src/features/stealth/components/EncryptedSenderCard';
import { PayMethodTiles } from '@/src/features/stealth/components/PayMethodTiles';
import { PayRecents } from '@/src/features/stealth/components/PayRecents';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={[
        sansation,
        {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: T.inkFaint,
          marginBottom: 12,
          marginLeft: 4,
          includeFontPadding: false,
        },
      ]}
    >
      {children}
    </Text>
  );
}

/** Payment tab landing: pay people + claim incoming private transfers.
 *  The tab bar is rendered by app/(tabs)/_layout.tsx — not here. */
export function PayHub() {
  const insets = useSafeAreaInsets();
  return (
    <CenterGlow tone="silver" flat>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 22,
          paddingBottom: 18,
        }}
      >
        <Text
          style={[
            serif,
            { fontSize: 32, fontStyle: 'italic', color: T.ink, includeFontPadding: false },
          ]}
        >
          Pay
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 26 }}>
          <EncryptedSenderCard />
        </View>

        <SectionLabel>New payment</SectionLabel>
        <View style={{ marginBottom: 30 }}>
          <PayMethodTiles />
        </View>

        <SectionLabel>Recents</SectionLabel>
        <PayRecents />
      </ScrollView>
    </CenterGlow>
  );
}
