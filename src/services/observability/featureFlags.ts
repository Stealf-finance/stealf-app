import { useEffect, useState } from 'react';
import { getPostHog } from './posthog';

/**
 * Per-slice feature flag with a killswitch path.
 *
 * - In `__DEV__`, always returns `defaultValue` (so the dev workspace stays
 *   editable without depending on PostHog). Override by hard-coding `false`
 *   locally if you specifically want to test a "slice off" path.
 * - In production, reads the flag from PostHog (lazy: returns `defaultValue`
 *   until PostHog has loaded the flag set).
 *
 * Convention: each slice is gated behind `slice-<name>-enabled` so we can
 * disable a buggy slice from the PostHog dashboard without shipping a build.
 */
export function useFeatureFlag(name: string, defaultValue = false): boolean {
  const [enabled, setEnabled] = useState(defaultValue);

  useEffect(() => {
    if (__DEV__) {
      setEnabled(defaultValue);
      return;
    }

    const ph = getPostHog();
    if (!ph) {
      setEnabled(defaultValue);
      return;
    }

    let cancelled = false;
    void Promise.resolve(ph.getFeatureFlag(name)).then((value) => {
      if (cancelled) return;
      setEnabled(value === true ? true : defaultValue);
    });
    return () => {
      cancelled = true;
    };
  }, [name, defaultValue]);

  return enabled;
}
