import { apiGet } from '@/src/services/api/client';
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
