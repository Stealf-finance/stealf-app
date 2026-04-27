import * as Sentry from '@sentry/react-native';
import { getEnv } from '../env';

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;

  const { EXPO_PUBLIC_SENTRY_DSN } = getEnv();
  const enabled = !!EXPO_PUBLIC_SENTRY_DSN;

  Sentry.init({
    dsn: EXPO_PUBLIC_SENTRY_DSN,
    enabled,
    enableAutoSessionTracking: enabled,
    debug: __DEV__ && enabled,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });

  initialized = true;
  if (__DEV__) {
    console.log(enabled ? '[Sentry] initialized' : '[Sentry] inert (DSN not set)');
  }
  return enabled;
}

export { Sentry };
