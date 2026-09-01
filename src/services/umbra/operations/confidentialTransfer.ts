import { getTransferorFunction } from '@umbra-privacy/sdk/transfer';
import type { Address } from '@solana/kit';
import { getActiveClient, type UmbraClient } from '../client';
import { checkRegistrationStatus } from '../registration';

/** `getTransferorFunction` throws without one; the client holds every part. */
function executorConfigFor(client: UmbraClient) {
  return {
    signer: client.signer,
    getLatestBlockhash: client.blockhashProvider,
    transactionForwarder: client.transactionForwarder,
    computationMonitor: client.computationMonitor,
  };
}

/**
 * Encrypted balance → encrypted balance, in one MPC round-trip. No ZK proof
 * and no claim: the receiver's balance moves on the callback. See umbra.md.
 */
export async function confidentialTransfer(
  receiverAddress: Address,
  mint: Address,
  amount: bigint,
) {
  const client = await getActiveClient();
  await checkRegistrationStatus(client);

  const transfer = getTransferorFunction(
    { client },
    { executorConfig: executorConfigFor(client) },
  );

  const result = await transfer({
    receiverAddress,
    mint,
    transferAmount: amount as never,
  });

  // Only the four shared-sender variants run build+submit. A network-mode
  // sender stops at prepare, and nothing has been broadcast.
  if (result.kind !== 'submitted') {
    throw new Error(
      `Confidential transfer stopped at prepare (${result.preparation.variant})`,
    );
  }
  return result;
}
