import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey, ClientState } from '@turnkey/react-native-wallet-kit';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import { fetchUserProfile, userProfileQueries } from '../api/userProfile';
import { useAuth } from '../context/AuthContext';
import { classifyPasskeyError } from '../lib/passkeyHelpers';

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

      const { sessionToken } = await loginWithPasskey();
      if (!sessionToken) throw new Error('No session token received from Turnkey');

      const wallets = await refreshWallets();
      const cashWallet = wallets.find((w) => w.walletName?.includes('Cash'));
      const bankWallet = cashWallet?.accounts?.[0]?.address;
      if (!bankWallet) throw new Error('Failed to retrieve bank wallet address');

      const profile = await fetchUserProfile(sessionToken, bankWallet);

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
