import { useEffect, useState } from 'react';
import { getPostHog } from './posthog';

export function useFeatureFlag(name: string, defaultValue = false): boolean {
  const [enabled, setEnabled] = useState(defaultValue);

  useEffect(() => {
    // Dev builds (and any environment without a PostHog client) keep the flag
    // at its default — which is already the initial state, so no synchronous
    // setState is needed here. Only the resolved remote value updates it, async.
    if (__DEV__) return;

    const ph = getPostHog();
    if (!ph) return;

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
