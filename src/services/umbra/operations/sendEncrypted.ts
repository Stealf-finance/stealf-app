import type { Address } from '@solana/kit';
import { getStealthClient } from '../client';
import { getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction } from './transfer';

/**
 * Stealth encrypted balance → receiver-claimable UTXO. The recipient must be
 * registered with Umbra (their userCommitment PDA must exist on-chain); the
 * UTXO sits in the program until the recipient claims it.
 *
 * Network fees are paid by the stealth public ATA, not the encrypted balance,
 * so the wallet still needs a small SOL reserve to cover signatures + the
 * priority fee on the create-UTXO transaction.
 */
export async function sendEncrypted(
  destinationAddress: Address,
  mint: Address,
  amount: bigint,
) {
  const client = await getStealthClient();
  const create = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction({
    client,
  });
  return create({ destinationAddress, mint, amount });
}
