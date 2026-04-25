import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { TabBar, TabId } from '@/src/design-system/primitives/TabBar';

const TAB_IDS: TabId[] = ['bank', 'stealth', 'invest', 'profile'];

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  const active: TabId = TAB_IDS.includes(last as TabId) ? (last as TabId) : 'bank';

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Slot />
      <TabBar
        active={active}
        onTab={(id) => {
          switch (id) {
            case 'bank':
              router.replace('/(tabs)/bank');
              break;
            case 'stealth':
              router.replace('/(tabs)/stealth');
              break;
            case 'invest':
              router.replace('/(tabs)/invest');
              break;
            case 'profile':
              router.replace('/(tabs)/profile');
              break;
          }
        }}
        onMoove={() => router.push('/moove')}
      />
    </View>
  );
}
