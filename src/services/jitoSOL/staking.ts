import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { depositSol } from '@solana/spl-stake-pool';
import { JITO_STAKE_POOL_ADDRESS } from './constants';
import { getJitoConnection } from './connection';
import { getStealthKeypair } from './signer';
import { solToLamports } from './poolMath';

export async function stakeSOL(amountSol: number): Promise<string> {
  const connection = getJitoConnection();
  const keypair = await getStealthKeypair();
  const lamports = solToLamports(amountSol);

  const { instructions, signers } = await depositSol(
    connection,
    JITO_STAKE_POOL_ADDRESS,
    keypair.publicKey,
    lamports,
  );

  const transaction = new Transaction().add(...instructions);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = keypair.publicKey;

  // Ephemeral signers from the pool lib (if any) + the stealth wallet.
  return sendAndConfirmTransaction(
    connection,
    transaction,
    [keypair, ...signers],
    { commitment: 'confirmed' },
  );
}
