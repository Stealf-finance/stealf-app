import { z } from 'zod';
import { apiPost } from '@/src/services/api/client';

export const FaucetClaimResponseSchema = z.object({
  signature: z.string(),
  amountLamports: z.number(),
  // The backend still knows the retired 'stealf' wallet type; accept it on the
  // way back rather than failing the parse on a stale response.
  walletType: z.enum(['cash', 'stealf']),
  nextAvailableAt: z.string(),
});

export type FaucetClaimResponse = z.infer<typeof FaucetClaimResponseSchema>;

export async function claimFaucet(
  token: string,
  wallet: string,
): Promise<FaucetClaimResponse> {
  const raw = await apiPost('/api/faucet/claim', token, {
    wallet,
    walletType: 'cash',
  });
  return FaucetClaimResponseSchema.parse(raw);
}
