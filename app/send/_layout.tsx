import { Stack } from 'expo-router';
import { T } from '@/src/design-system/tokens';

export default function SendLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
      }}
    />
  );
}
