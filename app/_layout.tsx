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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
