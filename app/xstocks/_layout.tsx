import { Stack } from 'expo-router';

export default function XstocksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
      }}
    />
  );
}
