/**
 * PRIVATE SWAP — orchestration.
 *
 * Umbra has no swap primitive; per the Umbra team the pattern is: unshield value
 * into a throwaway wallet, run a normal public Jupiter swap from it, then
 * re-shield the output back into the encrypted balance. Full flow:
 *
 *   1. sponsored gas — a Stealf treasury grants native SOL to the ephemeral so it
 *      can pay its own tx fees (the Umbra relayer only pays the unshield/claim,
 *      and the claim delivers wSOL, not lamports). Only on-chain link is
 *      treasury -> ephemeral, never user -> ephemeral. (/api/swap/private/fund-gas)
 *   2. unshield the swap amount to the ephemeral (self-claimable UTXO → relayer)
 *   3. public Jupiter swap FROM the ephemeral (taker = ephemeral, ephemeral-signed)
 *   4. read the REALIZED output (the ephemeral's actual outputMint balance)
 *   5. re-shield that output into the stealth encrypted balance, signed by the
 *      ephemeral (it owns the output ATA; it registers with Umbra first)
 *
 * ⚠️ GUARDED OFF (PRIVATE_SWAP_ENABLED = false). The gas blocker is now solved
 * (sponsored treasury), but the full flow still cannot be exercised on devnet
 * (Jupiter is mainnet-only; the Umbra pool here is devnet) — it MUST be validated
 * end-to-end on mainnet, with the treasury (SWAP_GAS_TREASURY_SECRET) funded,
 * before flipping the flag. See private-swap.md.
 *
 * Fee: charge via a Jupiter referral account added server-side in
 * jupiterSwapService.getOrder (default 0%) — see private-swap.md.
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createSignerFromPrivateKeyBytes } from '@umbra-privacy/sdk';
import { toAddress } from '@/src/services/solana/kit';
import { getClient, getStealthClient } from '@/src/services/umbra/client';
import { ensureRegisteredFor } from '@/src/services/umbra/registration';
import {
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
} from '@/src/services/umbra/operations/transfer';
import { claimReceived, claimSelfToPublic } from '@/src/services/umbra/operations/burnNotes';
import { buildSwapOrder, executeSwap, fundEphemeralGas, type ExecuteResponse } from '../api/swap';
import { signSwapTransaction } from '@/src/services/wallet/signStealthTransaction';
import { createEphemeralKeypair } from './ephemeralWallet';

/** Flip to true only once the full flow is validated on mainnet (private-swap.md). */
export const PRIVATE_SWAP_ENABLED = false;

export interface PrivateSwapParams {
  sessionToken: string;
  /** Stealth wallet address (destination of the re-shield). */
  stealthWallet: string;
  inputMint: string;
  outputMint: string;
  /** Swap input amount, in base units of inputMint. */
  amountBaseUnits: bigint;
  slippageBps?: number;
}

export interface PrivateSwapResult {
  execute: ExecuteResponse;
  ephemeral: string;
}

/** The ephemeral's realized output = its actual on-chain outputMint balance. */
async function readOutputAmount(
  rpcUrl: string,
  owner: string,
  mint: string,
): Promise<bigint> {
  const conn = new Connection(rpcUrl, 'confirmed');
  const { value } = await conn.getParsedTokenAccountsByOwner(new PublicKey(owner), {
    mint: new PublicKey(mint),
  });
  let total = 0n;
  for (const acc of value) {
    const amt = acc.account.data.parsed?.info?.tokenAmount?.amount;
    if (amt) total += BigInt(amt);
  }
  return total;
}

export async function runPrivateSwap(
  params: PrivateSwapParams,
): Promise<PrivateSwapResult> {
  if (!PRIVATE_SWAP_ENABLED) {
    throw new Error(
      'private swap is not enabled — validate the full flow on mainnet first (see private-swap.md)',
    );
  }

  const { sessionToken, stealthWallet, inputMint, outputMint, amountBaseUnits, slippageBps } =
    params;

  const ephemeral: Keypair = createEphemeralKeypair();
  const ephemeralAddr = ephemeral.publicKey.toBase58();

  // 1. Sponsored gas — treasury grants native SOL to the ephemeral.
  const { rpcUrl } = await fundEphemeralGas(sessionToken, ephemeralAddr);

  // 2. Unshield the swap amount to the ephemeral (relayer-paid claim).
  const stealthClient = await getStealthClient();
  const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction({
    client: stealthClient,
  });
  const utxo = await createUtxo({
    destinationAddress: toAddress(ephemeralAddr),
    mint: toAddress(inputMint),
    amount: amountBaseUnits,
  });
  await claimSelfToPublic([utxo]);

  // 3. Public Jupiter swap FROM the ephemeral (pays its own fee from the grant).
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

  // 4. Realized output (not the quote) = the ephemeral's actual balance.
  const outAmount = await readOutputAmount(rpcUrl, ephemeralAddr, outputMint);
  if (outAmount <= 0n) {
    throw new Error('private swap: swap produced no output to re-shield');
  }

  // 5. Re-shield into the stealth encrypted balance, signed by the ephemeral
  //    (it owns the output ATA). The ephemeral registers with Umbra first.
  const ephemeralSigner = await createSignerFromPrivateKeyBytes(ephemeral.secretKey);
  const ephemeralClient = await getClient(ephemeralSigner);
  await ensureRegisteredFor(ephemeralClient);
  const reShield = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({
    client: ephemeralClient,
  });
  const reShieldUtxo = await reShield({
    destinationAddress: toAddress(stealthWallet),
    mint: toAddress(outputMint),
    amount: outAmount,
  });
  await claimReceived([reShieldUtxo]);

  return { execute, ephemeral: ephemeralAddr };
}
