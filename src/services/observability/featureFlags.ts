import { useEffect, useState } from 'react';
import { getPostHog } from './posthog';


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
