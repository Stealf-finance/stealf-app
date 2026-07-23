import { View } from 'react-native';
import { Stack } from 'expo-router';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { T } from '@/src/design-system/tokens';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <CenterGlow tone="silver" flat>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'none',
          }}
        />
      </CenterGlow>
    </View>
  );
}
