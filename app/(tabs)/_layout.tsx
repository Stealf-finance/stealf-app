import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';
import { usePrivacyMode } from '@/src/features/stealth/PrivacyModeContext';
import { PendingOpsPill } from '@/src/components/pending-ops/PendingOpsPill';

const TAB_IDS: TabId[] = ['bank', 'stealth', 'grow', 'profile'];

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { tone } = usePrivacyMode();

  // When a root-level modal (claim-pending, send, send-money, …) is pushed
  // from inside (tabs), useSegments() no longer points at a tab id. Keep
  // showing the last-known tab as active so the bar doesn't snap to 'bank'
  // during the modal transition.
  const tabSegment = segments.find((s) => TAB_IDS.includes(s as TabId)) as
    | TabId
    | undefined;
  const [lastTab, setLastTab] = useState<TabId>(tabSegment ?? 'bank');
  useEffect(() => {
    if (tabSegment && tabSegment !== lastTab) setLastTab(tabSegment);
  }, [tabSegment, lastTab]);
  const active = tabSegment ?? lastTab;
  const tabBarTone = active === 'stealth' ? tone : 'silver';

  const handleTab = (id: TabId) => {
    if (id === active) return;
    switch (id) {
      case 'bank':
        router.replace('/(tabs)/bank');
        break;
      case 'stealth':
        router.replace('/(tabs)/stealth');
        break;
      case 'grow':
        router.replace('/(tabs)/grow');
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
