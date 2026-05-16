import {
  AccountRole,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getRpc,
  LAMPORTS_PER_SOL,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  toAddress,
} from '@/src/services/solana/kit';
import { createNoopSigner } from '@solana/kit';
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import { SOL_MINT } from '@/src/constants/solana';

const SYSTEM_PROGRAM = toAddress('11111111111111111111111111111111');

/** Native SOL is always sent via System program, never SPL transferChecked.
 * The SPL WSOL mint exists but our bank balance is held as native lamports,
 * not wrapped SOL. Treat both `null` mint and the canonical WSOL mint as SOL. */
export function isNativeSolMint(mint: string | null | undefined): boolean {
  return !mint || mint === SOL_MINT;
}

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

/**
 * Build an SPL transfer (TransferChecked). Derives source + destination ATAs,
 * auto-creates the destination ATA if missing (sender pays rent), and signs
 * the authority through `createNoopSigner` so the marker account-meta is set
 * for the external signer (Turnkey bank or local ED25519 stealth) to fill
 * the signature slot during the sign step.
 *
 * Reject native-SOL mints here — callers should branch via `isNativeSolMint`.
 */
export async function buildSplTransferMessage(params: {
  fromAddress: string;
  toAddress: string;
  mint: string;
  /** Raw on-chain amount (token base units, not humanised). */
  rawAmount: bigint;
  decimals: number;
}) {
  const { fromAddress, toAddress: recipient, mint, rawAmount, decimals } = params;
  if (isNativeSolMint(mint)) {
    throw new Error('buildSplTransferMessage called with native SOL mint');
  }

  const rpc = getRpc();
  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: 'finalized' })
    .send();

  const fromAddr = toAddress(fromAddress);
  const toAddr = toAddress(recipient);
  const mintAddr = toAddress(mint);

  const [sourceAta] = await findAssociatedTokenPda({
    owner: fromAddr,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint: mintAddr,
  });
  const [destAta] = await findAssociatedTokenPda({
    owner: toAddr,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint: mintAddr,
  });

  // Mark the sender as fee-payer + authority signer. `createNoopSigner` does
  // not produce a signature; it just satisfies the type and the account-meta
  // marker so the external signer (Turnkey or local) can sign at send time.
  const payerSigner = createNoopSigner(fromAddr);

  const destAtaInfo = await rpc
    .getAccountInfo(destAta, { encoding: 'base64' })
    .send();
  const destAtaExists = destAtaInfo.value !== null;

  const createIx = destAtaExists
    ? null
    : await getCreateAssociatedTokenInstructionAsync({
        payer: payerSigner,
        owner: toAddr,
        mint: mintAddr,
      });
  const transferIx = getTransferCheckedInstruction({
    source: sourceAta,
    mint: mintAddr,
    destination: destAta,
    authority: payerSigner,
    amount: rawAmount,
    decimals,
  });
  const instructions = createIx ? [createIx, transferIx] : [transferIx];

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(fromAddr, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
  );

  return { message, latestBlockhash, destAtaCreated: !destAtaExists };
}
