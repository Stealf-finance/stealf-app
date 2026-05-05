import { View } from 'react-native';
import { Stack } from 'expo-router';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { T } from '@/src/design-system/tokens';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <CenterGlow tone="silver">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            // AuthFlow owns the intra-flow fade between auth/email/otp;
            // an Expo Router screen-level fade on top of that produces
            // a competing crossfade that reads as ghosting. Disable
            // here — there is only one route in this stack anyway.
            animation: 'none',
          }}
        />
      </CenterGlow>
    </View>
  );
}
