import * as Sentry from '@sentry/react-native';
import { getEnv } from '../env';

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;

  const { EXPO_PUBLIC_SENTRY_DSN } = getEnv();
  if (!EXPO_PUBLIC_SENTRY_DSN) {
    if (__DEV__) console.warn('[Sentry] Skipped init — EXPO_PUBLIC_SENTRY_DSN not set');
    return false;
  }

  Sentry.init({
    dsn: EXPO_PUBLIC_SENTRY_DSN,
    enableAutoSessionTracking: true,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });

  initialized = true;
  if (__DEV__) console.log('[Sentry] initialized');
  return true;
}

export { Sentry };
