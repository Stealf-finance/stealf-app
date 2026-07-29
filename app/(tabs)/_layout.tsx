import { Slot } from 'expo-router';
import { View } from 'react-native';
import { T } from '@/src/design-system/tokens';
import { AppNavBar } from '@/src/components/nav/AppNavBar';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Slot />
      <AppNavBar />
    </View>
  );
}
