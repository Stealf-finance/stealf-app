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
import { getActiveClient } from '@/src/services/umbra/client';
import { hasActiveSigner } from '@/src/services/umbra/signers/active';
import { useUmbraSigner } from '@/src/features/umbra/hooks/useUmbraSigner';
import { prefetchEncryptedBalancesFor } from '@/src/features/umbra/hooks/useEncryptedBalances';

/**
 * Orchestrates per-feature subscriptions (sockets, prefetches) once the user
 * is authenticated. Each slice appends its `subscribeXxx()` here.
 */
export function DataBootstrap() {
  const { isAuthenticated, user, session } = useAuth();
  const queryClient = useQueryClient();

  // Publishes the Turnkey signer to Umbra's service layer. Mounted here so it
  // installs once, before any flow reaches for a client.
  useUmbraSigner();

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
      console.log('[DataBootstrap] init — bankWallet=' + user.bankWallet);

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
    const bankWallet = user.bankWallet;
    if (bankWallet) warmWallet(bankWallet);

    if (bankWallet) {
      void (async () => {
        try {
          // Turnkey hydrates its wallet accounts asynchronously; until the
          // signer is installed there is no Umbra client to build. The flows
          // that need one build it lazily at action time, so skipping here
          // only costs a cold first read.
          if (!hasActiveSigner()) return;

          const [publicBalance] = await Promise.all([
            queryClient.fetchQuery({
              queryKey: balanceQueries.byAddress(bankWallet),
              queryFn: () => fetchBalance(session.sessionToken, bankWallet),
              staleTime: Infinity,
            }),
            getActiveClient(),
          ]);

          await prefetchEncryptedBalancesFor(
            queryClient,
            bankWallet,
            publicBalance,
          );

          // Claim scan is intentionally NOT prefetched here. For a fresh
          // wallet the SDK still has to walk the full Merkle tree from
          // cursor 0 to confirm "no UTXOs", which is 10-14s of JS-thread
          // crypto on cold start and freezes interactions in the first
          // seconds after sign-in / wallet creation. The Claims screen
          // and the ClaimPendingScreen both opt-in via `{ fetch: true }`
          // — that's the natural moment for the cost (the user is
          // explicitly looking at claim state). Returning users hit the
          // AsyncStorage cache there and feel it instant.

          if (__DEV__) console.log('[DataBootstrap] umbra warmup done');
        } catch (err) {
          if (__DEV__)
            console.warn('[DataBootstrap] umbra warmup failed:', err);
        }
      })();
    }

    const cleanups: (() => void)[] = [];
    if (bankWallet) {
      cleanups.push(subscribeToWalletUpdates(queryClient, bankWallet));
    }

    cleanups.push(
      socketService.onReconnect(() => {
        if (__DEV__)
          console.log(
            '[DataBootstrap] socket reconnected → invalidating wallet queries',
          );
        if (bankWallet) {
          queryClient.invalidateQueries({
            queryKey: balanceQueries.byAddress(bankWallet),
          });
          queryClient.invalidateQueries({
            queryKey: historyQueries.byAddress(bankWallet),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.bankWallet, session?.sessionToken, queryClient]);

  return null;
}
