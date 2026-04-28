import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  fetchUserProfile,
  userProfileQueries,
} from '@/src/features/onboarding/api/userProfile';
import { subscribeToWalletUpdates } from '@/src/features/bank/api/subscriptions';

/**
 * Orchestrates per-feature subscriptions (sockets, prefetches) once the user
 * is authenticated. Each slice appends its `subscribeXxx()` here.
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

    const cleanups: (() => void)[] = [];
    if (user.bankWallet) {
      cleanups.push(subscribeToWalletUpdates(queryClient, user.bankWallet));
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [isAuthenticated, user, session, queryClient]);

  return null;
}
