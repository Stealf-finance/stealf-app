import { Stack } from 'expo-router';

// Inner stack of the Send modal: chooser (index) → flow. Fade transitions
// mirror the onboarding pattern so navigating from the menu to the flow
// reads as one continuous step inside a single modal — instead of two
// stacked iOS sheets.
export default function SendLayout() {
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
