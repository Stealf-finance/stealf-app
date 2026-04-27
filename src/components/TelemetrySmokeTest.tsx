import { useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';
import { Sentry } from '@/src/services/observability/sentry';

/**
 * Dev-only one-shot smoke for the Phase-0 DoD: fire a PostHog event,
 * fetch a feature flag, capture a Sentry breadcrumb. Runs once on mount.
 */
export function TelemetrySmokeTest() {
  const posthog = usePostHog();

  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;

    const run = async () => {
      try {
        if (posthog) {
          posthog.capture('phase_0_telemetry_smoke', { ts: Date.now() });
          const flag = await posthog.getFeatureFlag('slice-stealth-enabled');
          if (!cancelled) console.log('[Telemetry] PostHog flag slice-stealth-enabled =', flag);
        }
        Sentry.addBreadcrumb({
          category: 'lifecycle',
          message: 'phase_0_boot',
          level: 'info',
        });
        console.log('[Telemetry] smoke ran (PostHog event sent + Sentry breadcrumb)');
      } catch (err) {
        console.warn('[Telemetry] smoke failed:', err);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [posthog]);

  return null;
}
