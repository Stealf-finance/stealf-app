import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';
import { usePrivacyMode } from '@/src/features/stealth/PrivacyModeContext';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { PendingOpsPill } from '@/src/components/pending-ops/PendingOpsPill';

const TAB_IDS: TabId[] = ['bank', 'stealth', 'profile'];

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { tone } = usePrivacyMode();
  const { user } = useAuth();
  const isStealthSetup = !user?.stealfWallet;

  const tabSegment = segments.find((s) => TAB_IDS.includes(s as TabId)) as
    | TabId
    | undefined;
  const [lastTab, setLastTab] = useState<TabId>(tabSegment ?? 'bank');
  useEffect(() => {
    if (tabSegment && tabSegment !== lastTab) setLastTab(tabSegment);
  }, [tabSegment, lastTab]);
  const active = tabSegment ?? lastTab;
  const tabBarTone =
    active === 'stealth' && !isStealthSetup ? tone : 'silver';

  const handleTab = (id: TabId) => {
    if (id === active) return;
    switch (id) {
      case 'bank':
        router.replace('/(tabs)/bank');
        break;
      case 'stealth':
        router.replace('/(tabs)/stealth');
        break;
      case 'profile':
        router.replace('/(tabs)/profile');
        break;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Slot />
      <TabBar active={active} tone={tabBarTone} onTab={handleTab} />
      <PendingOpsPill />
    </View>
  );
}
