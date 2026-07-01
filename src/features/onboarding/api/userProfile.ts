import { apiGet, apiPut } from '@/src/services/api/client';
import { UserProfileResponseSchema, type User } from '../types';

export const userProfileQueries = {
  byBankWallet: (bankWallet: string) => ['user-profile', bankWallet] as const,
};

export async function fetchUserProfile(
  sessionToken: string,
  bankWallet: string,
): Promise<User> {
  const raw = await apiGet(`/api/users/${bankWallet}`, sessionToken);
  return UserProfileResponseSchema.parse(raw);
}

/** Updates the authenticated user's pseudo (username). Throws an ApiError
 *  (e.g. 409 when the pseudo is already taken) the caller can surface. */
export async function updatePseudo(
  sessionToken: string,
  pseudo: string,
): Promise<User> {
  const raw = await apiPut('/api/users/pseudo', sessionToken, { pseudo });
  return UserProfileResponseSchema.parse(raw);
}
