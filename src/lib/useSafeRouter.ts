import { useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';

const THROTTLE_MS = 800;

export function useSafeRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const lastRef = useRef<{ href: string; at: number } | null>(null);

  const push = useCallback(
    (href: Parameters<typeof router.push>[0]) => {
      const key = typeof href === 'string' ? href : JSON.stringify(href);
      const target = key.split('?')[0];
      if (pathname === target) return;
      const now = Date.now();
      if (
        lastRef.current?.href === key &&
        now - lastRef.current.at < THROTTLE_MS
      ) {
        return;
      }
      lastRef.current = { href: key, at: now };
      router.push(href);
    },
    [router, pathname],
  );

  return useMemo(
    () => ({
      push,
      back: router.back,
      replace: router.replace,
      canGoBack: router.canGoBack,
    }),
    [router, push],
  );
}
