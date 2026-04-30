import { useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';

const THROTTLE_MS = 800;

/**
 * Wraps `useRouter` so the same destination can't be pushed twice in a row —
 * either because the user double-taps a tile, or because two presses fire
 * before the first one navigates. Two guards combined:
 *
 *   1. Drop pushes targeting the current pathname (already there).
 *   2. Drop pushes to the same href within THROTTLE_MS of the last one
 *      (covers the gap before pathname updates).
 *
 * `back` and `replace` are passed through unchanged.
 */
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
