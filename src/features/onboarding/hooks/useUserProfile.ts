import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { fetchUserProfile, userProfileQueries } from '../api/userProfile';

export function useUserProfile() {
  const { session, user } = useAuth();
  const bankWallet = user?.bankWallet ?? null;
  const sessionToken = session?.sessionToken ?? null;

  return useQuery({
    queryKey: bankWallet
      ? userProfileQueries.byBankWallet(bankWallet)
      : ['user-profile', 'idle'],
    queryFn: async () => {
      if (!sessionToken || !bankWallet) {
        throw new Error('useUserProfile: not authenticated');
      }
      return fetchUserProfile(sessionToken, bankWallet);
    },
    enabled: !!sessionToken && !!bankWallet,
    staleTime: 60_000,
  });
}
