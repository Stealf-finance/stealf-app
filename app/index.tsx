import { Redirect } from 'expo-router';
import { getEnv } from '@/src/services/env';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  // Defense-in-depth: bypass is dev-only even if the env var leaks
  // into a release build.
  if (__DEV__ && getEnv().EXPO_PUBLIC_DEV_BYPASS_AUTH) {
    return <Redirect href="/(tabs)/bank" />;
  }

  // Wait for the AuthProvider's keychain hydration before deciding where to
  // route — otherwise we briefly flash welcome before AuthGuard redirects.
  if (isLoading) return null;

  return isAuthenticated ? (
    <Redirect href="/(tabs)/bank" />
  ) : (
    <Redirect href="/(auth)/welcome" />
  );
}
