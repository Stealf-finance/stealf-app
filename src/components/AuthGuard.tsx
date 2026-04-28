import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

const AUTH_GROUP = '(auth)';
const TABS_GROUP = '(tabs)';

/**
 * Redirects between (auth) and (tabs) based on the AuthContext state.
 * Idempotent — only navigates when the current segment is wrong.
 */
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
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
  }, [isAuthenticated, isLoading, segments, router]);

  return null;
}
