import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey, ClientState } from '@turnkey/react-native-wallet-kit';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { fetchUserProfile, userProfileQueries } from '../api/userProfile';
import { useAuth } from '../context/AuthContext';
import { classifyPasskeyError } from '../lib/passkeyHelpers';
import { balanceQueries, fetchBalance } from '@/src/features/bank/api/balance';
import { historyQueries, fetchHistory } from '@/src/features/bank/api/history';

export function useSignIn() {
  const { loginWithPasskey, refreshWallets, clientState } = useTurnkey();
  const { setSession, setUser } = useAuth();
  const queryClient = useQueryClient();
  const isClientReady = clientState === ClientState.Ready;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isClientReady) {
        throw new Error('App is still starting up. Please try again.');
      }

      if (__DEV__) console.log('[useSignIn] loginWithPasskey…');
      const { sessionToken } = await loginWithPasskey();
      if (!sessionToken) throw new Error('No session token received from Turnkey');

      const wallets = await refreshWallets();
      const cashWallet = wallets.find((w) => w.walletName?.includes('Cash'));
      const bankWallet = cashWallet?.accounts?.[0]?.address;
      if (!bankWallet) throw new Error('Failed to retrieve bank wallet address');
      if (__DEV__) console.log('[useSignIn] bankWallet=', bankWallet);

      // Catch up on what happened while signed out: pull profile + bank
      // balance + history in parallel. They land in the RQ cache so the Bank
      // tab renders fresh data on first paint with no spinner.
      // We DROP any stale cache for these keys first so prefetch always hits
      // the network — staleTime: Infinity would otherwise reuse pre-restart data.
      queryClient.removeQueries({ queryKey: balanceQueries.byAddress(bankWallet) });
      queryClient.removeQueries({ queryKey: historyQueries.byAddress(bankWallet) });

      if (__DEV__) console.log('[useSignIn] prefetching profile + balance + history…');
      const [profile] = await Promise.all([
        fetchUserProfile(sessionToken, bankWallet),
        queryClient.prefetchQuery({
          queryKey: balanceQueries.byAddress(bankWallet),
          queryFn: () => fetchBalance(sessionToken, bankWallet),
          staleTime: Infinity,
        }),
        queryClient.prefetchQuery({
          queryKey: historyQueries.byAddress(bankWallet),
          queryFn: () => fetchHistory(sessionToken, bankWallet, 10),
          staleTime: Infinity,
        }),
      ]);
      if (__DEV__) console.log('[useSignIn] prefetch done');

      queryClient.setQueryData(userProfileQueries.byBankWallet(bankWallet), profile);
      await walletKeyCache.warmup();

      setSession({ sessionToken });
      setUser(profile);

      return profile;
    },
    onError: (err) => {
      if (__DEV__) console.error('[useSignIn] error:', err);
    },
  });

  return {
    signIn: mutation.mutate,
    signInAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isClientReady,
    error: mutation.error ? classifyPasskeyError(mutation.error).userMessage : null,
    reset: mutation.reset,
  };
}
