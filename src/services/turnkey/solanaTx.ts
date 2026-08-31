import {
  Connection,
  PublicKey,
  Transaction,
  type Signer,
  type TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';

/**
 * Signs a legacy web3.js transaction with the bank wallet's Turnkey key and
 * broadcasts it.
 *
 * Callers pass `signHex`, a Turnkey `signTransaction` already bound to the
 * wallet account — services stay free of React that way.
 *
 * Some stake-pool instructions need ephemeral keypairs (the SOL transfer
 * account on deposit, the stake account on withdraw). Those are signed here
 * against the canonical message bytes, and re-attached after Turnkey returns:
 * Turnkey re-serialises the transaction, and we can't assume it carries foreign
 * signatures through. Re-attaching is a no-op when it does.
 */
export async function signAndSendWithTurnkey({
  connection,
  instructions,
  feePayer,
  ephemeralSigners = [],
  signHex,
}: {
  connection: Connection;
  instructions: TransactionInstruction[];
  feePayer: PublicKey;
  ephemeralSigners?: Signer[];
  signHex: (unsignedHex: string) => Promise<string>;
}): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('finalized');

  const tx = new Transaction().add(...instructions);
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = feePayer;

  // Canonical message every signature is taken over. Computed once, before any
  // signature lands, so re-attaching below can never sign a different message.
  const message = tx.serializeMessage();
  const ephemeral = ephemeralSigners.map((s) => ({
    publicKey: s.publicKey,
    signature: Buffer.from(nacl.sign.detached(message, s.secretKey)),
  }));
  for (const { publicKey, signature } of ephemeral) {
    tx.addSignature(publicKey, signature);
  }

  const unsignedHex = tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString('hex');

  const signedHex = await signHex(unsignedHex);
  const signed = Transaction.from(Buffer.from(signedHex, 'hex'));

  for (const { publicKey, signature } of ephemeral) {
    const slot = signed.signatures.find((s) => s.publicKey.equals(publicKey));
    if (!slot?.signature) signed.addSignature(publicKey, signature);
  }

  const raw = signed.serialize();
  const signature = await connection.sendRawTransaction(raw, {
    preflightCommitment: 'confirmed',
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );
  return signature;
}
