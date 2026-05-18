import * as Sentry from '@sentry/react-native';
import { getEnv } from '../env';
import { scrubString } from './scrub';

let initialized = false;

function scrub<T>(value: T): T {
  if (typeof value === 'string') return scrubString(value) as unknown as T;
  if (Array.isArray(value)) return value.map(scrub) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrub(v);
    }
    return out as unknown as T;
  }
  return value;
}

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
    environment: __DEV__ ? 'dev' : 'production',
    // Defense-in-depth: the scrubber below already strips JWT/bs58/email,
    // but disabling default PII (IP / cookies / user agent) keeps Sentry
    // from collecting fields the scrubber doesn't touch in the first place.
    sendDefaultPii: false,
    // Mobile Session Replay is intentionally disabled — wallet/balance/seed
    // screens must not be captured. Same rule applied to PostHog. Do not
    // add `mobileReplayIntegration()` here without an explicit policy change.
    enableLogs: true,
    beforeSend(event) {
      if (event.message) event.message = scrubString(event.message);
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = scrubString(ex.value);
        }
      }
      if (event.extra) event.extra = scrub(event.extra);
      if (event.contexts) event.contexts = scrub(event.contexts);
      if (event.tags) event.tags = scrub(event.tags);
      if (event.user) {
        const { id, ip_address, ...rest } = event.user;
        event.user = { id, ip_address, ...scrub(rest) };
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: b.message ? scrubString(b.message) : b.message,
          data: b.data ? scrub(b.data) : b.data,
        }));
      }
      return event;
    },
    beforeBreadcrumb(crumb) {
      return {
        ...crumb,
        message: crumb.message ? scrubString(crumb.message) : crumb.message,
        data: crumb.data ? scrub(crumb.data) : crumb.data,
      };
    },
  });

  initialized = true;
  if (__DEV__) {
    console.log(enabled ? '[Sentry] initialized' : '[Sentry] inert (DSN not set)');
  }
  return enabled;
}

export const __TEST_ONLY__ = { scrubString, scrub };

export { Sentry };
