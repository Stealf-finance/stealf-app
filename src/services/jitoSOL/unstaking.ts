import { PublicKey } from '@solana/web3.js';
import { withdrawSol, withdrawStake } from '@solana/spl-stake-pool';
import { JITO_STAKE_POOL_ADDRESS } from './constants';
import { getJitoConnection } from './connection';
import { signAndSendWithTurnkey } from '@/src/services/turnkey/solanaTx';

export async function unstakeJitoSOL(
  amountJitoSol: number,
  owner: string,
  signHex: (unsignedHex: string) => Promise<string>,
  { instant = false }: { instant?: boolean } = {},
): Promise<string> {
  if (!Number.isFinite(amountJitoSol) || amountJitoSol <= 0) {
    throw new Error(`Invalid JitoSOL amount: ${amountJitoSol}`);
  }
  const connection = getJitoConnection();
  const feePayer = new PublicKey(owner);

  // `withdrawStake` creates an ephemeral stake account keypair in `signers`.
  const { instructions, signers } = instant
    ? await withdrawSol(
        connection,
        JITO_STAKE_POOL_ADDRESS,
        feePayer,
        feePayer,
        amountJitoSol,
      )
    : await withdrawStake(
        connection,
        JITO_STAKE_POOL_ADDRESS,
        feePayer,
        amountJitoSol,
      );

  return signAndSendWithTurnkey({
    connection,
    instructions,
    feePayer,
    ephemeralSigners: signers,
    signHex,
  });
}
