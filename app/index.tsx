import { Redirect } from 'expo-router';
import { getEnv } from '@/src/services/env';

export default function Index() {
  // Dev: when EXPO_PUBLIC_DEV_BYPASS_AUTH=true, land directly in the app shell
  // so the designer doesn't have to walk through onboarding on every reload.
  if (getEnv().EXPO_PUBLIC_DEV_BYPASS_AUTH) {
    return <Redirect href="/(tabs)/bank" />;
  }
  return <Redirect href="/(auth)/welcome" />;
}
