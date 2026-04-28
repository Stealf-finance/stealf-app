import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';
import { usePrivacyMode } from '@/src/features/stealth/PrivacyModeContext';

const TAB_IDS: TabId[] = ['bank', 'stealth', 'grow', 'profile'];

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { tone } = usePrivacyMode();
  const last = segments[segments.length - 1];
  const active: TabId = TAB_IDS.includes(last as TabId)
    ? (last as TabId)
    : 'bank';
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
    </View>
  );
}
