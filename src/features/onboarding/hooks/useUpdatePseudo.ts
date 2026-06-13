import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { updatePseudo, userProfileQueries } from '../api/userProfile';

/** Mutation to change the user's pseudo (username). On success it patches the
 *  AuthContext user (the profile's source of truth) and the cached profile,
 *  preserving client-only fields like `email` / `authMethod`. The mutation
 *  rejects with an ApiError whose `message` is backend-supplied (e.g. the 409
 *  "This username is already taken"), so callers can show it directly. */
export function useUpdatePseudo() {
  const { session, user, setUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pseudo: string) => {
      const token = session?.sessionToken;
      if (!token) throw new Error('Not authenticated');
      return updatePseudo(token, pseudo);
    },
    onSuccess: (updated) => {
      if (user) setUser({ ...user, username: updated.username });
      queryClient.setQueryData<typeof updated>(
        userProfileQueries.byBankWallet(updated.bankWallet),
        (prev) => (prev ? { ...prev, username: updated.username } : updated),
      );
    },
  });
}
