import { PublicKey } from '@solana/web3.js';
import { depositSol } from '@solana/spl-stake-pool';
import { JITO_STAKE_POOL_ADDRESS } from './constants';
import { getJitoConnection } from './connection';
import { signAndSendWithTurnkey } from '@/src/services/turnkey/solanaTx';
import { solToLamports } from './poolMath';

export async function stakeSOL(
  amountSol: number,
  owner: string,
  signHex: (unsignedHex: string) => Promise<string>,
): Promise<string> {
  const connection = getJitoConnection();
  const feePayer = new PublicKey(owner);
  const lamports = solToLamports(amountSol);

  // `depositSol` returns an ephemeral SOL-transfer keypair in `signers`.
  const { instructions, signers } = await depositSol(
    connection,
    JITO_STAKE_POOL_ADDRESS,
    feePayer,
    lamports,
  );

  return signAndSendWithTurnkey({
    connection,
    instructions,
    feePayer,
    ephemeralSigners: signers,
    signHex,
  });
}
