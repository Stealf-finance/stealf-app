import {
  getETAIntoReceiverBurnableStealthPoolNoteCreatorFunction as sdkGetEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getETAIntoSelfBurnableStealthPoolNoteCreatorFunction as sdkGetEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getATAIntoReceiverBurnableStealthPoolNoteCreatorFunction as sdkGetPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getATAIntoSelfBurnableStealthPoolNoteCreatorFunction as sdkGetPublicBalanceToSelfClaimableUtxoCreatorFunction,
} from '@umbra-privacy/sdk/deposit';
import type { Address } from '@solana/kit';
import {
  createCreateUtxoWithReceiverUnlockerZkProver,
  createCreateUtxoWithEphemeralUnlockerZkProver,
  createCreateUtxoFromPublicBalanceWithEphemeralUnlockerZkProver,
  createCreateUtxoFromPublicBalanceWithReceiverUnlockerZkProver,
} from '@/src/features/stealth/zk';
import { ensureRegisteredFor } from '@/src/features/stealth/lib/registration';
import type { UmbraClient } from '../client';

interface CreateUtxoArgs {
  destinationAddress: Address;
  mint: Address;
  amount: bigint;
}

/**
 * Thin wrappers over Umbra SDK's UTXO creator factories. Each wrapper:
 *   1. Injects the matching zkProver (the SDK doesn't bundle them).
 *   2. Registers the creator's client on first use.
 *   3. Casts `amount` to U64 (the SDK's branded bigint).
 *
 * The wrapper does NOT register the destination wallet. Receiver-claimable
 * UTXOs read the destination's userCommitment PDA on-chain, so the caller
 * must `ensureRegistered` / `ensureRegisteredFor` the destination before
 * invoking the creator if it isn't already known to be registered.
 */

export function getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction({
  client,
}: {
  client: UmbraClient;
}) {
  const sdkFn = sdkGetEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver: createCreateUtxoWithReceiverUnlockerZkProver() },
  );
  return async ({ destinationAddress, mint, amount }: CreateUtxoArgs) => {
    await ensureRegisteredFor(client);
    return sdkFn({ destinationAddress, mint, amount: amount as any });
  };
}

export function getEncryptedBalanceToSelfClaimableUtxoCreatorFunction({
  client,
}: {
  client: UmbraClient;
}) {
  const sdkFn = sdkGetEncryptedBalanceToSelfClaimableUtxoCreatorFunction(
    { client },
    { zkProver: createCreateUtxoWithEphemeralUnlockerZkProver() },
  );
  return async ({ destinationAddress, mint, amount }: CreateUtxoArgs) => {
    await ensureRegisteredFor(client);
    return sdkFn({ destinationAddress, mint, amount: amount as any });
  };
}

export function getPublicBalanceToReceiverClaimableUtxoCreatorFunction({
  client,
}: {
  client: UmbraClient;
}) {
  const sdkFn = sdkGetPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver: createCreateUtxoFromPublicBalanceWithReceiverUnlockerZkProver() },
  );
  return async ({ destinationAddress, mint, amount }: CreateUtxoArgs) => {
    await ensureRegisteredFor(client);
    return sdkFn({ destinationAddress, mint, amount: amount as any });
  };
}

export function getPublicBalanceToSelfClaimableUtxoCreatorFunction({
  client,
}: {
  client: UmbraClient;
}) {
  const sdkFn = sdkGetPublicBalanceToSelfClaimableUtxoCreatorFunction(
    { client },
    { zkProver: createCreateUtxoFromPublicBalanceWithEphemeralUnlockerZkProver() },
  );
  return async ({ destinationAddress, mint, amount }: CreateUtxoArgs) => {
    await ensureRegisteredFor(client);
    return sdkFn({ destinationAddress, mint, amount: amount as any });
  };
}
