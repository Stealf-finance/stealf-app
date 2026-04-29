import {
  AccountRole,
  appendTransactionMessageInstruction,
  createTransactionMessage,
  getRpc,
  LAMPORTS_PER_SOL,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  toAddress,
} from '@/src/services/solana/kit';

const SYSTEM_PROGRAM = toAddress('11111111111111111111111111111111');

export function encodeTransferLamports(lamports: bigint): Uint8Array {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true); // System program: transfer = ix index 2
  view.setBigUint64(4, lamports, true);
  return data;
}

export function lamportsForSol(amountSol: number): bigint {
  if (!Number.isFinite(amountSol) || amountSol < 0) {
    throw new Error(`Invalid SOL amount: ${amountSol}`);
  }
  return BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
}

export async function buildSolTransferMessage(params: {
  fromAddress: string;
  toAddress: string;
  amountSol: number;
}) {
  const { fromAddress, toAddress: recipient, amountSol } = params;
  const rpc = getRpc();
  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: 'finalized' })
    .send();

  const lamports = lamportsForSol(amountSol);

  const transferInstruction = {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: toAddress(fromAddress), role: AccountRole.WRITABLE_SIGNER as const },
      { address: toAddress(recipient), role: AccountRole.WRITABLE as const },
    ],
    data: encodeTransferLamports(lamports),
  };

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(toAddress(fromAddress), tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(transferInstruction, tx),
  );

  return { message, latestBlockhash };
}
