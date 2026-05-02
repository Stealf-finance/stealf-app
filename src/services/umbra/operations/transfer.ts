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


export interface TransferToReceiverArgs extends GetBankClientArgs {
  destinationAddress: Address;
  mint: Address;
  amount: bigint;
}

export async function transferFromEncryptedBalanceToReceiver(
  args: TransferToReceiverArgs,
) {
  const { destinationAddress, mint, amount, ...bankClientArgs } = args;

  await ensureRegistered();
  const bankClient = await getBankClient(bankClientArgs);
  await ensureRegisteredFor(bankClient);

  const client = await getStealthClient();
  const zkProver = createCreateUtxoWithReceiverUnlockerZkProver();
  const createUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver },
  );
  return createUtxo({
    destinationAddress,
    mint,
    amount: amount as any,
  });
}

export async function transferFromPublicStealthToReceiver(
  args: TransferToReceiverArgs,
) {
  const { destinationAddress, mint, amount, ...bankClientArgs } = args;

  await ensureRegistered();
  const bankClient = await getBankClient(bankClientArgs);
  await ensureRegisteredFor(bankClient);

  const client = await getStealthClient();
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
