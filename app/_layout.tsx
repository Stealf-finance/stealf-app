import '../global.css';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import { T } from '@/src/design-system/tokens';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { TurnkeyProvider } from '@turnkey/react-native-wallet-kit';
import { PostHogProvider } from 'posthog-react-native';

import { validateEnv, getEnv } from '@/src/services/env';
import { initSentry, Sentry } from '@/src/services/observability/sentry';
import { queryClient, PERSIST_OPTIONS } from '@/src/services/queryClient';
import {
  TURNKEY_CONFIG,
  TURNKEY_CALLBACKS,
} from '@/src/services/turnkey/config';
import { AuthProvider } from '@/src/features/onboarding/context/AuthContext';
import { PrivacyModeProvider } from '@/src/features/stealth/PrivacyModeContext';
import { BalanceVisibilityProvider } from '@/src/features/wallet/BalanceVisibilityContext';
import { SocketProvider } from '@/src/components/SocketProvider';
import { DataBootstrap } from '@/src/components/DataBootstrap';
import { AuthGuard } from '@/src/components/AuthGuard';
import { TelemetrySmokeTest } from '@/src/components/TelemetrySmokeTest';
import { PendingOpsProvider } from '@/src/components/pending-ops/PendingOpsContext';
import { ToastProvider } from '@/src/components/toast/ToastContext';
import { ToastHost } from '@/src/components/toast/ToastHost';
import { AnimatedSplash } from '@/src/components/AnimatedSplash';
import { OfflineBanner } from '@/src/components/OfflineBanner';

SplashScreen.preventAutoHideAsync();

// Boot-time validation: missing/malformed env vars throw before React renders.
validateEnv();
initSentry();

const env = getEnv();

const PRELOAD_IMAGES = [
  require('../assets/images/splash-icon.png'),
];

const BOOT_START = Date.now();

function RootLayout() {
  const [imagesLoaded, setImagesLoaded] = useState(false);
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
    Asset.loadAsync(PRELOAD_IMAGES)
      .catch((err) => {
        if (__DEV__) console.warn('[boot] image preload failed:', err);
      })
      .finally(() => setImagesLoaded(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && imagesLoaded) {
      if (__DEV__)
        console.log(`[boot-timing] splash-hide=${Date.now() - BOOT_START}ms`);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, imagesLoaded]);

  if ((!fontsLoaded && !fontError) || !imagesLoaded) return null;

  const tree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={PERSIST_OPTIONS}
        >
          <TurnkeyProvider
            config={TURNKEY_CONFIG}
            callbacks={TURNKEY_CALLBACKS}
          >
            <AuthProvider>
              <SocketProvider>
                <PrivacyModeProvider initial="public">
                  <BalanceVisibilityProvider>
                    <PendingOpsProvider>
                      <ToastProvider>
                        <DataBootstrap />
                        <AuthGuard />
                        <TelemetrySmokeTest />
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: T.bg },
                          }}
                        >
                          <Stack.Screen
                            name="(auth)"
                            options={{ animation: 'fade' }}
                          />
                          <Stack.Screen
                            name="(tabs)"
                            options={{ animation: 'fade' }}
                          />
                          <Stack.Screen
                            name="moove"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="shield"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="unshield"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="card"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="lock"
                            options={{ presentation: 'fullScreenModal' }}
                          />
                          <Stack.Screen
                            name="send"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="receive"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="claim-pending"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="transactions"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="account-details"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="jito"
                            options={{ animation: 'slide_from_right' }}
                          />
                          <Stack.Screen
                            name="claims"
                            options={{
                              presentation: 'transparentModal',
                              animation: 'fade',
                              // Override the root opaque contentStyle so the
                              // screen behind shows through and the BlurView
                              // actually frosts it (same look as the Umbra
                              // setup overlay).
                              contentStyle: { backgroundColor: 'transparent' },
                            }}
                          />
                          <Stack.Screen
                            name="tx/[id]"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="profile/private-key"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="asset-picker"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="xstocks"
                            options={{ presentation: 'modal' }}
                          />
                          <Stack.Screen
                            name="borrow"
                            options={{ presentation: 'modal' }}
                          />
                        </Stack>
                        <ToastHost />
                        <OfflineBanner />
                        <AnimatedSplash />
                        <StatusBar style="light" />
                      </ToastProvider>
                    </PendingOpsProvider>
                  </BalanceVisibilityProvider>
                </PrivacyModeProvider>
              </SocketProvider>
            </AuthProvider>
          </TurnkeyProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  // Always mount the provider so `usePostHog()` never throws — even in local
  // dev without a key. With no real key we mount a placeholder client with
  // lifecycle capture off, so nothing flushes to a bogus project.
  const hasPostHog = Boolean(env.EXPO_PUBLIC_POSTHOG_API_KEY);

  return (
    <PostHogProvider
      apiKey={env.EXPO_PUBLIC_POSTHOG_API_KEY ?? 'phc_localdev_placeholder'}
      options={{
        host: env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        enableSessionReplay: false,
        captureAppLifecycleEvents: hasPostHog,
      }}
      autocapture={false}
    >
      {tree}
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayout);
