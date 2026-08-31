import { useMutation } from '@tanstack/react-query';
import { registerPrivacyWallet } from '@/src/features/umbra/api/registerStealfWallet';

export type RegisterStealfWalletArgs = {
  sessionToken: string;
  walletAddress: string;
};

/**
 * Registers a stealth wallet address with the backend. Thin mutation wrapper
 * so screens never call the `api/` layer directly (3-layer rule).
 */
export function useRegisterStealfWallet() {
  return useMutation({
    mutationFn: ({ sessionToken, walletAddress }: RegisterStealfWalletArgs) =>
      registerPrivacyWallet(sessionToken, walletAddress),
  });
}
