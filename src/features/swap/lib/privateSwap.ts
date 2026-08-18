/**
 * PRIVATE SWAP — orchestration (WIP, guarded off).
 *
 * Umbra has no swap primitive; per the Umbra team the pattern is: unshield value
 * into a throwaway wallet, run a normal public Jupiter swap from it, then (here)
 * re-shield the output back into the encrypted balance. This module wires the
 * REAL in-repo primitives in that order:
 *
 *   1. unshield the swap amount + a little SOL for gas as TWO self-claimable
 *      UTXOs to an ephemeral wallet  (getEncryptedBalanceToSelfClaimableUtxo… +
 *      claimSelfToPublic — the same creator+claim MoveFlow uses to send to the
 *      bank wallet, just pointed at the ephemeral address)
 *   2. public Jupiter swap FROM the ephemeral wallet (taker = ephemeral, signed
 *      with the ephemeral keypair)  (buildSwapOrder → signSwapTransaction →
 *      executeSwap)
 *   3. re-shield the swap output back into the stealth encrypted balance
 *      (getPublicBalanceToReceiverClaimableUtxo… on an ephemeral-signer client +
 *      claimReceived)
 *
 * ⚠️ GUARDED OFF (PRIVATE_SWAP_ENABLED = false). Three mechanics MUST be
 * validated on MAINNET against the live Umbra pool before this is wired to any
 * UI — they cannot be exercised on devnet (Jupiter is mainnet-only; the Umbra
 * pool used here is devnet), and each is money-critical:
 *   (A) GAS: the relayer lands wSOL in the ephemeral's wSOL ATA, but the Jupiter
 *       tx fee needs NATIVE SOL. Unwrap (close the wSOL ATA to the ephemeral) or
 *       fund gas another way. [TODO A]
 *   (B) RE-SHIELD signer: the public-balance→receiver creator must run on an
 *       Umbra client whose signer is the EPHEMERAL wallet (it owns the output
 *       ATA). Wire getClient(ephemeralSigner). [TODO B]
 *   (C) AMOUNTS: the re-shield amount is the swap's realized outAmount (parse
 *       from the /execute or a post-swap balance read), not the quote. [TODO C]
 *
 * Fee: charge via a Jupiter referral account added server-side in
 * jupiterSwapService.getOrder (default 0%) — see private-swap.md.
 */
import { Keypair } from '@solana/web3.js';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { getStealthClient } from '@/src/services/umbra/client';
import {
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
} from '@/src/services/umbra/operations/transfer';
import { claimSelfToPublic, claimReceived } from '@/src/services/umbra/operations/burnNotes';
import { buildSwapOrder, executeSwap, type ExecuteResponse } from '../api/swap';
import { signSwapTransaction } from '@/src/services/wallet/signStealthTransaction';
import { createEphemeralKeypair } from './ephemeralWallet';

/** Flip to true only once the [TODO A/B/C] mechanics are validated on mainnet. */
export const PRIVATE_SWAP_ENABLED = false;

export interface PrivateSwapParams {
  /** Turnkey session token (for the backend-brokered Jupiter order/execute). */
  sessionToken: string;
  /** Stealth wallet address (destination of the re-shield). */
  stealthWallet: string;
  inputMint: string;
  outputMint: string;
  /** Swap input amount, in base units of inputMint. */
  amountBaseUnits: bigint;
  /** Native SOL (lamports) to unshield alongside for the ephemeral's tx fee. */
  gasLamports: bigint;
  slippageBps?: number;
}

export interface PrivateSwapResult {
  execute: ExecuteResponse;
  ephemeral: string;
}

/**
 * Run one private swap. See the module header — this is WIP and guarded; the
 * gas-unwrap, re-shield-signer, and realized-amount steps are marked [TODO] and
 * must be validated on mainnet before enabling.
 */
export async function runPrivateSwap(
  params: PrivateSwapParams,
): Promise<PrivateSwapResult> {
  if (!PRIVATE_SWAP_ENABLED) {
    throw new Error(
      'private swap is not enabled — validate the gas/re-shield/amount mechanics on mainnet first (see private-swap.md)',
    );
  }

  const {
    sessionToken,
    stealthWallet,
    inputMint,
    outputMint,
    amountBaseUnits,
    gasLamports,
    slippageBps,
  } = params;

  const ephemeral: Keypair = createEphemeralKeypair();
  const ephemeralAddr = ephemeral.publicKey.toBase58();
  const stealthClient = await getStealthClient();

  // 1. Unshield the two UTXOs (swap amount + gas SOL) into the ephemeral wallet.
  const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction({
    client: stealthClient,
  });
  const utxoSwap = await createUtxo({
    destinationAddress: toAddress(ephemeralAddr),
    mint: toAddress(inputMint),
    amount: amountBaseUnits,
  });
  const utxoGas = await createUtxo({
    destinationAddress: toAddress(ephemeralAddr),
    mint: toAddress(SOL_MINT), // wSOL — see [TODO A]
    amount: gasLamports,
  });
  await claimSelfToPublic([utxoSwap, utxoGas]);

  // [TODO A] Unwrap the ephemeral's wSOL → native SOL so it can pay the Jupiter
  // tx fee (close the wSOL ATA to the ephemeral owner). MAINNET-VALIDATE.

  // 2. Public Jupiter swap FROM the ephemeral wallet.
  const order = await buildSwapOrder(sessionToken, {
    inputMint,
    outputMint,
    amount: amountBaseUnits.toString(),
    taker: ephemeralAddr,
    slippageBps,
  });
  const signed = await signSwapTransaction(order.transaction!, ephemeral);
  const execute = await executeSwap(sessionToken, {
    requestId: order.requestId,
    signedTransaction: signed,
  });

  // 3. Re-shield the swap output back into the stealth encrypted balance.
  // [TODO B] This creator must run on an ephemeral-signer Umbra client
  // (getClient(ephemeralSigner)); the stealth client cannot spend the ephemeral
  // ATA. [TODO C] `outAmount` must be the swap's realized output, not the quote.
  const outAmount = BigInt(order.outAmount ?? '0'); // [TODO C] use realized amount
  const reShield = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({
    client: stealthClient, // [TODO B] should be getClient(ephemeralSigner)
  });
  const reShieldUtxo = await reShield({
    destinationAddress: toAddress(stealthWallet),
    mint: toAddress(outputMint),
    amount: outAmount,
  });
  await claimReceived([reShieldUtxo]);

  return { execute, ephemeral: ephemeralAddr };
}
