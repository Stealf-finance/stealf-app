import { getPublicBalanceToEncryptedBalanceDirectDepositorFunction } from '@umbra-privacy/sdk';
import type { Address } from '@solana/kit';
import { getStealthClient } from '../client';
import { ensureRegistered } from '@/src/features/stealth/lib/registration';

/**
 * Deposit from the stealth wallet's public balance into its own encrypted
 * balance. Both source and destination are the same wallet.
 */
export async function deposit(mint: Address, amount: bigint) {
  await ensureRegistered();
  const client = await getStealthClient();
  const doDeposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({
    client,
  });
  return doDeposit(client.signer.address, mint, amount as any);
}
