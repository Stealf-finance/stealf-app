import { PublicKey } from '@solana/web3.js';
import { JITOSOL_MINT } from './constants';
import { getJitoConnection } from './connection';

export type JitoSolBalance = {
  uiAmount: number;
  raw: bigint;
};

export async function getJitoSolBalance(
  walletAddress: string,
): Promise<JitoSolBalance> {
  const connection = getJitoConnection();
  const owner = new PublicKey(walletAddress);

  const res = await connection.getParsedTokenAccountsByOwner(owner, {
    mint: JITOSOL_MINT,
  });

  const data = res.value[0]?.account.data;
  const tokenAmount =
    data && 'parsed' in data
      ? (data.parsed as { info?: { tokenAmount?: { amount?: string; uiAmount?: number } } })
          .info?.tokenAmount
      : undefined;

  if (!tokenAmount) return { uiAmount: 0, raw: 0n };
  return {
    uiAmount: tokenAmount.uiAmount ?? 0,
    raw: BigInt(tokenAmount.amount ?? '0'),
  };
}
