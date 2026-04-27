import { useEffect } from 'react';
import { Sentry } from '@/src/services/observability/sentry';
import { getPostHog } from '@/src/services/observability/posthog';

export function TelemetrySmokeTest() {
  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;

    const run = async () => {
      try {
        const posthog = getPostHog();
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
  }, []);

  return null;
}
