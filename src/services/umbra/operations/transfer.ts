import {
  getETAIntoReceiverBurnableStealthPoolNoteCreatorFunction as sdkGetEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getETAIntoSelfBurnableStealthPoolNoteCreatorFunction as sdkGetEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getATAIntoReceiverBurnableStealthPoolNoteCreatorFunction as sdkGetPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getATAIntoSelfBurnableStealthPoolNoteCreatorFunction as sdkGetPublicBalanceToSelfClaimableUtxoCreatorFunction,
} from '@umbra-privacy/sdk/deposit';
import { getUserAccountQuerierFunction } from "@umbra-privacy/sdk/query";
import type { Address } from '@solana/kit';
import {
  createCreateUtxoWithReceiverUnlockerZkProver,
  createCreateUtxoWithEphemeralUnlockerZkProver,
  createCreateUtxoFromPublicBalanceWithEphemeralUnlockerZkProver,
  createCreateUtxoFromPublicBalanceWithReceiverUnlockerZkProver,
} from '@/src/services/umbra/zk';
import { checkRegistrationStatus } from '@/src/services/umbra/registration';
import type { UmbraClient } from '../client';

interface CreateUtxoArgs {
  destinationAddress: Address;
  mint: Address;
  amount: bigint;
}

async function precheckRecipient(recipient: Address, client: UmbraClient) {
  const queryAccount = getUserAccountQuerierFunction({ client });
  const r = await queryAccount(recipient);
  const ready = r.state === 'exists' && r.data.isActiveForAnonymousUsage;

  if (!ready) {
    throw new Error('receiver is not registered');
  }
}

function toCreatorArgs({ destinationAddress, mint, amount }: CreateUtxoArgs) {
  return { destinationAddress, mint, amount: amount as never };
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
    await checkRegistrationStatus(client);
    await precheckRecipient(destinationAddress, client);
    return sdkFn(toCreatorArgs({ destinationAddress, mint, amount }));
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
    await checkRegistrationStatus(client);
    return sdkFn(toCreatorArgs({ destinationAddress, mint, amount }));
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
    await checkRegistrationStatus(client);
    await precheckRecipient(destinationAddress, client);
    return sdkFn(toCreatorArgs({ destinationAddress, mint, amount }));
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
    await checkRegistrationStatus(client);
    return sdkFn(toCreatorArgs({ destinationAddress, mint, amount }));
  };
}
