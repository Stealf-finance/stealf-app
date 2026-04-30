import { z } from 'zod';
import { apiPost } from '@/src/services/api/client';

// `apiPost` auto-unwraps the backend's `{ data: ... }` envelope, so we parse
// the inner shape directly.
const RegisterPrivacyWalletResponseSchema = z.object({
  stealf_wallet: z.string(),
});

export async function registerStealfWallet(
  token: string,
  walletAddress: string,
): Promise<void> {
  const raw = await apiPost('/api/wallet/privacy-wallet', token, {
    walletAddress,
  });
  RegisterPrivacyWalletResponseSchema.parse(raw);
}
