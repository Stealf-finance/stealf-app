import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/src/services/real-time/socket';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  fetchUserProfile,
  userProfileQueries,
} from '@/src/features/onboarding/api/userProfile';
import { subscribeToWalletUpdates } from '@/src/features/bank/api/subscriptions';
import { balanceQueries, fetchBalance } from '@/src/features/bank/api/balance';
import { historyQueries, fetchHistory } from '@/src/features/bank/api/history';

/**
 * Orchestrates per-feature subscriptions (sockets, prefetches) once the user
 * is authenticated. Each slice appends its `subscribeXxx()` here.
 */
export function DataBootstrap() {
  const { isAuthenticated, user, session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user || !session) {
      if (__DEV__)
        console.log(
          '[DataBootstrap] skip — auth=' + isAuthenticated,
          'user=' + !!user,
          'session=' + !!session,
        );
      return;
    }

    if (__DEV__)
      console.log(
        '[DataBootstrap] init — bankWallet=' + user.bankWallet,
        'stealfWallet=' + (user.stealfWallet ?? 'none'),
      );

    void queryClient.prefetchQuery({
      queryKey: userProfileQueries.byBankWallet(user.bankWallet),
      queryFn: () => fetchUserProfile(session.sessionToken, user.bankWallet),
      staleTime: 60_000,
    });


    const HISTORY_LIMIT = 10;
    const warmWallet = (address: string) => {
      void queryClient.prefetchQuery({
        queryKey: balanceQueries.byAddress(address),
        queryFn: () => fetchBalance(session.sessionToken, address),
        staleTime: Infinity,
      });
      void queryClient.prefetchQuery({
        queryKey: historyQueries.byAddress(address),
        queryFn: () =>
          fetchHistory(session.sessionToken, address, HISTORY_LIMIT),
        staleTime: Infinity,
      });
    };
    if (user.bankWallet) warmWallet(user.bankWallet);
    if (user.stealfWallet) warmWallet(user.stealfWallet);

    const cleanups: (() => void)[] = [];
    if (user.bankWallet) {
      cleanups.push(subscribeToWalletUpdates(queryClient, user.bankWallet));
    }
    if (user.stealfWallet) {
      cleanups.push(subscribeToWalletUpdates(queryClient, user.stealfWallet));
    }

    cleanups.push(
      socketService.onReconnect(() => {
        if (__DEV__)
          console.log(
            '[DataBootstrap] socket reconnected → invalidating wallet queries',
          );
        if (user.bankWallet) {
          queryClient.invalidateQueries({
            queryKey: balanceQueries.byAddress(user.bankWallet),
          });
          queryClient.invalidateQueries({
            queryKey: historyQueries.byAddress(user.bankWallet),
          });
        }
        if (user.stealfWallet) {
          queryClient.invalidateQueries({
            queryKey: balanceQueries.byAddress(user.stealfWallet),
          });
          queryClient.invalidateQueries({
            queryKey: historyQueries.byAddress(user.stealfWallet),
          });
        }
      }),
    );

    return () => {
      if (__DEV__) console.log('[DataBootstrap] cleanup');
      cleanups.forEach((fn) => fn());
    };
  }, [isAuthenticated, user, session, queryClient]);

  return null;
}
