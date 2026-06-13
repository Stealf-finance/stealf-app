// src/features/stealth/screens/PayHub.tsx
import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { TonalHalo } from '@/src/features/home/components/TonalHalo';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { GreetingSlot } from '@/src/components/GreetingSlot';
import { useToast } from '@/src/components/toast/ToastContext';
import { sansation } from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { T } from '@/src/design-system/tokens';
import { PayMethodTiles } from '@/src/features/stealth/components/PayMethodTiles';
import { PayRecents } from '@/src/features/stealth/components/PayRecents';
import { usePrivacyMode } from '@/src/features/stealth/PrivacyModeContext';

function SectionLabel({ children }: { children: string }) {
  return (
    <Kicker
      color={T.inkFaint}
      style={{
        fontSize: 11,
        letterSpacing: 1.6,
        marginBottom: 12,
        marginLeft: 4,
        includeFontPadding: false,
      }}
    >
      {children}
    </Kicker>
  );
}

/** Payment tab landing: pay people + claim incoming private transfers.
 *  The tab bar is rendered by app/(tabs)/_layout.tsx — not here. */
export function PayHub() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const { setMode } = usePrivacyMode();
  // Static silver halo (matches the home background). Held at 1 so it never
  // cross-fades to the gold variant.
  const haloProgress = useSharedValue(1);
  const soon = (label: string) =>
    show({ kind: 'info', title: 'Coming soon', message: `${label} are coming soon.` });
  // The Pay hub has no private/public mode; a prior private-send flow may have
  // left the shared PrivacyModeContext in 'private'. Reset on focus so the
  // centralized tab bar tone (driven by that context) stays silver to match.
  useFocusEffect(
    useCallback(() => {
      setMode('public');
    }, [setMode]),
  );
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <TonalHalo progress={haloProgress} />
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 22,
          paddingBottom: 18,
        }}
      >
        {/* Navbar — greeting (or live pending-op indicator) + card chip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
            marginBottom: 8,
          }}
        >
          <GreetingSlot />
          <CircleIconBtn iconKey="card" tone="silver" onPress={() => soon('Cards')} />
        </View>

        <Text
          style={[
            sansation,
            { fontSize: 32, fontWeight: '600', color: T.ink, includeFontPadding: false },
          ]}
        >
          New Payment
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 6, marginBottom: 30 }}>
          <PayMethodTiles />
        </View>

        <SectionLabel>Recents</SectionLabel>
        <PayRecents />
      </ScrollView>
    </View>
  );
}
