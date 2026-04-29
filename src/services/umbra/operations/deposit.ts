import {
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  isRegistrationError,
} from '@umbra-privacy/sdk';
import type { Address } from '@solana/kit';
import {
  getStealthClient,
  getBankClient,
  type GetBankClientArgs,
} from '../client';
import { ensureRegistered } from '@/src/features/stealth/lib/registration';
import { StealthError } from '@/src/features/stealth/lib/errors';

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

export interface DepositFromBankArgs extends GetBankClientArgs {
  destinationAddress: Address;
  mint: Address;
  amount: bigint;
}

export async function depositFromBank(args: DepositFromBankArgs) {
  try {
    await ensureRegistered();
  } catch (err: any) {
    const msg = err?.message || err?.cause?.message || '';
    const logs: string[] = err?.cause?.context?.logs || [];
    const isFeeProblem =
      /simulation failed|insufficient|rent/i.test(msg) ||
      logs.some((l: string) => /insufficient/i.test(l)) ||
      (isRegistrationError(err) && err.stage === 'transaction-send');

    if (isFeeProblem) {
      throw new StealthError({
        code: 'INSUFFICIENT_BALANCE',
        op: 'depositFromBank',
        rawMessage: msg,
        userMessage:
          'Your stealth wallet needs SOL to register on Umbra. Please add funds to your stealth wallet first.',
        cause: err,
      });
    }
    throw err;
  }

  const { destinationAddress, mint, amount, ...bankClientArgs } = args;
  const client = await getBankClient(bankClientArgs);
  const doDeposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({
    client,
  });
  return doDeposit(destinationAddress, mint, amount as any);
}
