import { Stack } from 'expo-router';

// Inner stack of the Receive modal: chooser (index) → flow. Same fade
// pattern as `app/send/_layout.tsx` so the menu→flow step feels like one
// continuous modal rather than two stacked sheets.
export default function ReceiveLayout() {
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
