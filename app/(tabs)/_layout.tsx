import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';

const TAB_IDS: TabId[] = ['bank', 'stealth', 'invest', 'profile'];

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  const active: TabId = TAB_IDS.includes(last as TabId) ? (last as TabId) : 'bank';

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <Slot />
      <TabBar
        active={active}
        onTab={(id) => router.replace(`/(tabs)/${id}` as any)}
        onMoove={() => router.push('/moove')}
      />
    </View>
  );
}
