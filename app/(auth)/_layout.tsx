import { View } from 'react-native';
import { Stack } from 'expo-router';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { T } from '@/src/design-system/tokens';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <TonalBackground tone="silver">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade',
            animationDuration: 280,
          }}
        />
      </TonalBackground>
    </View>
  );
}
