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
