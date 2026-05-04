import { PostHog } from 'posthog-react-native';
import { getEnv } from '../env';

let _client: PostHog | null = null;

export function initPostHog(): PostHog | null {
  if (_client) return _client;

  const env = getEnv();
  if (!env.EXPO_PUBLIC_POSTHOG_API_KEY) {
    if (__DEV__) console.warn('[PostHog] Skipped init — EXPO_PUBLIC_POSTHOG_API_KEY not set');
    return null;
  }

  _client = new PostHog(env.EXPO_PUBLIC_POSTHOG_API_KEY, {
    host: env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    enableSessionReplay: false,
    captureAppLifecycleEvents: true,
  });

  if (__DEV__) console.log('[PostHog] initialized');
  return _client;
}

export function getPostHog(): PostHog | null {
  return _client;
}
