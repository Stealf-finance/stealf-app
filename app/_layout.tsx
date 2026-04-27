import '../global.css';
import { useFonts } from 'expo-font';
import { T } from '@/src/design-system/tokens';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { TurnkeyProvider } from '@turnkey/react-native-wallet-kit';
import { PostHogProvider } from 'posthog-react-native';

import { validateEnv, getEnv } from '@/src/services/env';
import { initSentry, Sentry } from '@/src/services/observability/sentry';
import { queryClient } from '@/src/services/queryClient';
import { getTurnkeyConfig, TURNKEY_CALLBACKS } from '@/src/services/turnkey/config';
import { AuthProvider } from '@/src/features/onboarding/context/AuthContext';
import { SocketProvider } from '@/src/components/SocketProvider';
import { DataBootstrap } from '@/src/components/DataBootstrap';
import { TelemetrySmokeTest } from '@/src/components/TelemetrySmokeTest';

SplashScreen.preventAutoHideAsync();

// Boot-time validation: missing/malformed env vars throw before React renders.
validateEnv();
initSentry();

const env = getEnv();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sansation_300Light: require('../assets/fonts/Sansation/Sansation-Light.ttf'),
    Sansation_300Light_Italic: require('../assets/fonts/Sansation/Sansation-LightItalic.ttf'),
    Sansation_400Regular: require('../assets/fonts/Sansation/Sansation-Regular.ttf'),
    Sansation_400Regular_Italic: require('../assets/fonts/Sansation/Sansation-Italic.ttf'),
    Sansation_700Bold: require('../assets/fonts/Sansation/Sansation-Bold.ttf'),
    Sansation_700Bold_Italic: require('../assets/fonts/Sansation/Sansation-BoldItalic.ttf'),
    CormorantGaramond_500Medium_Italic,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const tree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <TurnkeyProvider config={getTurnkeyConfig()} callbacks={TURNKEY_CALLBACKS}>
            <AuthProvider>
              <SocketProvider>
                <DataBootstrap />
                <TelemetrySmokeTest />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: T.bg },
                  }}
                >
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="moove" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="shield" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="unshield" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="add-funds" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="card" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="lock" options={{ presentation: 'fullScreenModal' }} />
                  <Stack.Screen name="send" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="tx/[id]" options={{ presentation: 'modal' }} />
                </Stack>
                <StatusBar style="light" />
              </SocketProvider>
            </AuthProvider>
          </TurnkeyProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (!env.EXPO_PUBLIC_POSTHOG_API_KEY) return tree;

  return (
    <PostHogProvider
      apiKey={env.EXPO_PUBLIC_POSTHOG_API_KEY}
      options={{
        host: env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        enableSessionReplay: true,
        captureAppLifecycleEvents: true,
      }}
      autocapture
    >
      {tree}
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayout);
