import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  fetchUserProfile,
  userProfileQueries,
} from '@/src/features/onboarding/api/userProfile';

/**
 * Orchestrates per-feature subscriptions (sockets, prefetches) once the user
 * is authenticated. Each slice appends its `subscribeXxx()` here behind a
 * feature flag.
 */
export function DataBootstrap() {
  const { isAuthenticated, user, session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user || !session) return;

    void walletKeyCache.warmup();

    void queryClient.prefetchQuery({
      queryKey: userProfileQueries.byBankWallet(user.bankWallet),
      queryFn: () => fetchUserProfile(session.sessionToken, user.bankWallet),
      staleTime: 60_000,
    });

    return () => {
      // Slice 2+ subscriptions will register their cleanups here.
    };
  }, [isAuthenticated, user, session, queryClient]);

  return null;
}
