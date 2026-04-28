import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getEnv } from '@/src/services/env';

const AUTH_GROUP = '(auth)';
const TABS_GROUP = '(tabs)';

/**
 * Redirects between (auth) and (tabs) based on the AuthContext state.
 * Idempotent — only navigates when the current segment is wrong.
 *
 * Dev: when EXPO_PUBLIC_DEV_BYPASS_AUTH=true, the guard is inert so the
 * designer can navigate any route without being redirected. Never set
 * the var to "true" in a production build.
 */
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const bypass = getEnv().EXPO_PUBLIC_DEV_BYPASS_AUTH;

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
