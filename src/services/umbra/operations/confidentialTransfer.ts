import { getTransferorFunction } from '@umbra-privacy/sdk/transfer';
import type { Address } from '@solana/kit';
import { getActiveClient, type UmbraClient } from '../client';
import { checkRegistrationStatus } from '../registration';

/**
 * Arcium prices a computation in ACU, and the SDK defaults the bid to 0. The
 * transfer circuit costs ~1.39e9 ACU against the deposit's 4.27e8 — see
 * STORE.md for why a zero bid is suspected of leaving transfers unscheduled.
 */
export const DEFAULT_MICRO_LAMPORTS_PER_ACU = 1000n;

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
  optionalData?: Uint8Array,
  microLamportsPerAcu: bigint = DEFAULT_MICRO_LAMPORTS_PER_ACU,
) {
  // The SDK silently substitutes 32 zero bytes, which no backend can attribute.
  if (optionalData && optionalData.length !== 32) {
    throw new Error(
      `optionalData must be 32 bytes, got ${optionalData.length}`,
    );
  }
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
    optionalData,
    microLamportsPerAcu: microLamportsPerAcu as never,
  });

  // Only the four shared-sender variants run build+submit. A network-mode
  // sender stops at prepare, and nothing has been broadcast.
  if (result.kind !== 'submitted') {
    throw new Error(
      `Confidential transfer stopped at prepare (${result.preparation.variant})`,
    );
  }

  // A landed queue tx moves nothing on its own — the MPC callback does.
  const status = (result as { callback?: { status?: string } }).callback?.status;
  if (status !== 'finalized') {
    throw new Error(
      `Confidential transfer queued but the MPC computation did not finalize (${status ?? 'no callback'}). Signature ${String(result.signature)}`,
    );
  }
  return result;
}
