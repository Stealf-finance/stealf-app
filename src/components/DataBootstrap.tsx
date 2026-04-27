import { useEffect } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

/**
 * Orchestrates per-feature subscriptions (sockets, prefetches) once the user
 * is authenticated. Each slice plugs its `subscribeXxx()` here behind a
 * feature flag.
 */
export function DataBootstrap() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    // Slice 1+ will register per-feature subscriptions here.
    return () => {
      // cleanups will be appended slice-by-slice
    };
  }, [isAuthenticated, user]);

  return null;
}
