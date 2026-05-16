import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getEnv } from '@/src/services/env';

const AUTH_GROUP = '(auth)';
const TABS_GROUP = '(tabs)';

export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // Defense-in-depth: even if EXPO_PUBLIC_DEV_BYPASS_AUTH leaks into a
  // release build, the bypass is inert outside __DEV__.
  const bypass = __DEV__ && getEnv().EXPO_PUBLIC_DEV_BYPASS_AUTH;

  useEffect(() => {
    if (bypass) return;
    if (isLoading) return;

    const top = segments[0];
    const inAuthGroup = top === AUTH_GROUP;
    const inTabsGroup = top === TABS_GROUP;

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/bank');
      return;
    }

    if (!isAuthenticated && inTabsGroup) {
      router.replace('/(auth)/welcome');
    }
  }, [bypass, isAuthenticated, isLoading, segments, router]);

  return null;
}
