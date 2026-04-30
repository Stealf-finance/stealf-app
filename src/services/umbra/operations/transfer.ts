import {
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
} from '@umbra-privacy/sdk';
import type { Address } from '@solana/kit';
import {
  createCreateUtxoWithReceiverUnlockerZkProver,
  createCreateUtxoWithEphemeralUnlockerZkProver,
  createCreateUtxoFromPublicBalanceWithEphemeralUnlockerZkProver,
  createCreateUtxoFromPublicBalanceWithReceiverUnlockerZkProver,
} from '@/src/features/stealth/zk';
import {
  getStealthClient,
  getBankClient,
  type GetBankClientArgs,
} from '../client';
import {
  ensureRegistered,
  ensureRegisteredFor,
} from '@/src/features/stealth/lib/registration';

/** Private send: creates a UTXO claimable by `recipient`. */
export async function sendPrivate(
  recipient: Address,
  mint: Address,
  amount: bigint,
) {
  await ensureRegistered();
  const client = await getStealthClient();
  const zkProver = createCreateUtxoWithReceiverUnlockerZkProver();
  const createUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver },
  );
  return createUtxo({
    destinationAddress: recipient,
    mint,
    amount: amount as any,
  });
}

/**
 * Self-claimable UTXO from the stealth's encrypted balance.
 * Source: shielded pool (signed by stealth wallet).
 * Default destination = signer; pass `destinationAddress` to direct the UTXO
 * to a different self-claimer (e.g. the bank wallet for shielded → bank).
 */
export async function selfShield(
  mint: Address,
  amount: bigint,
  destinationAddress?: Address,
) {
  await ensureRegistered();
  const client = await getStealthClient();
  const zkProver = createCreateUtxoWithEphemeralUnlockerZkProver();
  const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction(
    { client },
    { zkProver },
  );
  return createUtxo({
    destinationAddress: destinationAddress ?? client.signer.address,
    mint,
    amount: amount as any,
  });
}

/**
 * Self-claimable UTXO from the stealth's PUBLIC balance (its ATA), signed by
 * the stealth wallet's local key. The UTXO is locked to `destinationAddress`
 * — pass the bank address for stealth → bank, or omit for self-shield from
 * public.
 */
export async function selfShieldFromPublicStealth(
  mint: Address,
  amount: bigint,
  destinationAddress?: Address,
) {
  await ensureRegistered();
  const client = await getStealthClient();
  const zkProver =
    createCreateUtxoFromPublicBalanceWithEphemeralUnlockerZkProver();
  const createUtxo = getPublicBalanceToSelfClaimableUtxoCreatorFunction(
    { client },
    { zkProver },
  );
  return createUtxo({
    destinationAddress: destinationAddress ?? client.signer.address,
    mint,
    amount: amount as any,
  });
}

export interface DepositFromBankToReceiverArgs extends GetBankClientArgs {
  destinationAddress: Address;
  mint: Address;
  amount: bigint;
}

/**
 * Receiver-claimable UTXO from the BANK's public balance, signed by Turnkey.
 * Source: bank wallet ATA. The UTXO is locked to the receiver's registered
 * `userCommitment` — pass the stealth address as `destinationAddress` for
 * bank → shielded. The receiver claims it into their encrypted balance.
 *
 * BOTH wallets must be registered on Umbra:
 * - The receiver (stealth) so the SDK can read its `userCommitment` from
 *   the EncryptedUserAccount PDA when locking the UTXO.
 * - The sender (bank) so the SDK can produce a sender commitment for the
 *   mixer tree leaf — without it, the on-chain instruction fails simulation.
 */
export async function depositFromBankToReceiver(args: DepositFromBankToReceiverArgs) {
  await ensureRegistered();
  const { destinationAddress, mint, amount, ...bankClientArgs } = args;
  const client = await getBankClient(bankClientArgs);
  await ensureRegisteredFor(client);
  const zkProver =
    createCreateUtxoFromPublicBalanceWithReceiverUnlockerZkProver();
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver },
  );
  return createUtxo({
    destinationAddress,
    mint,
    amount: amount as any,
  });
}
