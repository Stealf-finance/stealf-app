import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { withdrawSol, withdrawStake } from '@solana/spl-stake-pool';
import { JITO_STAKE_POOL_ADDRESS } from './constants';
import { getJitoConnection } from './connection';
import { getStealthKeypair } from './signer';

export async function unstakeJitoSOL(
  amountJitoSol: number,
  { instant = false }: { instant?: boolean } = {},
): Promise<string> {
  if (!Number.isFinite(amountJitoSol) || amountJitoSol <= 0) {
    throw new Error(`Invalid JitoSOL amount: ${amountJitoSol}`);
  }
  const connection = getJitoConnection();
  const keypair = await getStealthKeypair();

  const { instructions, signers } = instant
    ? await withdrawSol(
        connection,
        JITO_STAKE_POOL_ADDRESS,
        keypair.publicKey,
        keypair.publicKey,
        amountJitoSol,
      )
    : await withdrawStake(
        connection,
        JITO_STAKE_POOL_ADDRESS,
        keypair.publicKey,
        amountJitoSol,
      );

  const transaction = new Transaction().add(...instructions);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = keypair.publicKey;

  // withdrawStake creates an ephemeral stake account keypair in `signers`.
  return sendAndConfirmTransaction(
    connection,
    transaction,
    [keypair, ...signers],
    { commitment: 'confirmed' },
  );
}
