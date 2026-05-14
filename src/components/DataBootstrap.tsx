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
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { getStealthClient } from '@/src/services/umbra/client';
import { prefetchEncryptedBalancesFor } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { claimScanQueries } from '@/src/features/stealth/hooks/useClaimScan';
import { fetchClaimScan } from '@/src/services/umbra/queries/claims';

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


    const stealfWallet = user.stealfWallet;
    if (stealfWallet) {
      void (async () => {
        try {
          // No eager walletKeyCache.warmup() at bootstrap — it would prompt
          // Face ID on every cold start (STEALF_PRIVATE_KEY is biometric-gated).
          // Warmup runs after explicit sign-in in useAuthFlow; signing flows
          // read lazily through the cache and prompt at action time.
          if (!walletKeyCache.hasKeys()) return;

          const [publicBalance] = await Promise.all([
            queryClient.fetchQuery({
              queryKey: balanceQueries.byAddress(stealfWallet),
              queryFn: () => fetchBalance(session.sessionToken, stealfWallet),
              staleTime: Infinity,
            }),
            getStealthClient(),
          ]);

          await prefetchEncryptedBalancesFor(
            queryClient,
            stealfWallet,
            publicBalance,
          );

          void queryClient.prefetchQuery({
            queryKey: claimScanQueries.byStealfWallet(stealfWallet),
            queryFn: () => fetchClaimScan(stealfWallet),
            staleTime: Infinity,
          });

          if (__DEV__) console.log('[DataBootstrap] stealth warmup done');
        } catch (err) {
          if (__DEV__)
            console.warn('[DataBootstrap] stealth warmup failed:', err);
        }
      })();
    }

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
    // Narrow deps: the bootstrap only needs to re-run when identity or
    // session token changes. Listing the whole `user` / `session` objects
    // tears down sockets + re-warms Umbra on every `setUser({...user,x:y})`,
    // causing a ~10s freeze on profile partial updates.
  }, [
    isAuthenticated,
    user?.bankWallet,
    user?.stealfWallet,
    session?.sessionToken,
    queryClient,
  ]);

  return null;
}
