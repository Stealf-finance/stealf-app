import { z } from 'zod';
import { apiPost } from '@/src/services/api/client';

export type FaucetWalletType = 'cash' | 'stealf';

export const FaucetClaimResponseSchema = z.object({
  signature: z.string(),
  amountLamports: z.number(),
  walletType: z.enum(['cash', 'stealf']),
  nextAvailableAt: z.string(),
});

export type FaucetClaimResponse = z.infer<typeof FaucetClaimResponseSchema>;

export async function claimFaucet(
  token: string,
  wallet: string,
  walletType: FaucetWalletType,
): Promise<FaucetClaimResponse> {
  const raw = await apiPost('/api/faucet/claim', token, { wallet, walletType });
  return FaucetClaimResponseSchema.parse(raw);
}
