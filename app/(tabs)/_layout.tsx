import { Slot } from 'expo-router';
import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { AppNavBar } from '@/src/components/nav/AppNavBar';
import { PendingOpsPill } from '@/src/components/pending-ops/PendingOpsPill';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Slot />
      <AppNavBar />
      <PendingOpsPill />
    </View>
  );
}
