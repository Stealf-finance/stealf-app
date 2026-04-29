import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { socketService } from '@/src/services/real-time/socket';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  fetchUserProfile,
  userProfileQueries,
} from '@/src/features/onboarding/api/userProfile';
import { subscribeToWalletUpdates } from '@/src/features/bank/api/subscriptions';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';

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
    if (user.stealfWallet) {
      cleanups.push(subscribeToWalletUpdates(queryClient, user.stealfWallet));
    }

    // Socket reconnect = we may have missed events while offline. Invalidate
    // balance + history so RQ refetches them fresh; future socket events
    // continue to drive incremental updates via setQueryData.
    cleanups.push(
      socketService.onReconnect(() => {
        if (__DEV__) console.log('[DataBootstrap] socket reconnected, invalidating wallet queries');
        if (user.bankWallet) {
          queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.bankWallet) });
          queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.bankWallet, 10) });
          queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.bankWallet, 4) });
        }
        if (user.stealfWallet) {
          queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.stealfWallet) });
          queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.stealfWallet, 10) });
        }
      }),
    );

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [isAuthenticated, user, session, queryClient]);

  return null;
}
