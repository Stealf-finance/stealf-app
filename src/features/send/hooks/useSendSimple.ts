import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { getTransactionEncoder } from '@solana/kit';
import {
  compileTransaction,
  createSignerFromBase58,
  signTransaction,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  assertIsTransactionWithinSizeLimit,
  getRpc,
} from '@/src/services/solana/kit';
import { getEnv } from '@/src/services/env';
import { walletKeyCache } from '@/src/services/cache/walletKeyCache';
import {
  guardTransaction,
  type GuardResult,
} from '@/src/services/solana/transactionsGuard';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import {
  buildSolTransferMessage,
  buildSplTransferMessage,
  isNativeSolMint,
} from '../lib/buildTransfer';
import { toRawAmount } from '../lib/amount';

export type WalletSource = 'bank' | 'stealth';

export interface SendSimpleParams {
  fromAddress: string;
  toAddress: string;
  /** Humanised amount typed by the user (e.g. 1.5 for 1.5 USDC). */
  amount: number;
  /** SPL mint, or null / SOL_MINT for native SOL. */
  mint: string | null;
  /** Token decimals (SOL=9, USDC=6, etc). */
  decimals: number;
  /** Selects the signer: Turnkey for bank, local ED25519 for stealth. */
  walletSource: WalletSource;
  /** Optional source-token balance (humanised) for pre-flight guard.
   *  For SOL this gates the SOL-fee-aware guard; for SPL it short-circuits
   *  obvious underflows but the on-chain check is the source of truth. */
  balance?: number;
}

export class GuardError extends Error {
  isGuard = true;
  constructor(message: string) {
    super(message);
    this.name = 'GuardError';
  }
}

/**
 * Sends a transfer signed by the active source wallet. Branches on `mint`:
 *   - native SOL → System program transfer (lamports)
 *   - SPL token  → TransferChecked + auto-create destination ATA if missing
 *
 * Pre-refactor, this hook always built a System transfer regardless of `mint`,
 * so picking USDC and typing "5" broadcast a 5 SOL transfer. Funds drain.
 *
 * Returns the transaction signature on broadcast acceptance (bank) or after
 * status confirmation (stealth).
 */
export function useSendSimple() {
  const { signAndSendTransaction, wallets } = useTurnkey();
  const queryClient = useQueryClient();
  const { EXPO_PUBLIC_SOLANA_RPC_URL } = getEnv();

  return useMutation({
    mutationFn: async ({
      fromAddress,
      toAddress,
      amount,
      mint,
      decimals,
      walletSource,
      balance,
    }: SendSimpleParams): Promise<string> => {
      const native = isNativeSolMint(mint);

      if (native) {
        const guard: GuardResult = guardTransaction({
          fromAddress,
          toAddress,
          amount: amount.toString(),
          amountSOL: amount,
          balanceSOL: balance,
        });
        if (!guard.valid) throw new GuardError(guard.error ?? 'Invalid transaction');
      } else {
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new GuardError('Amount must be greater than 0');
        }
        if (balance != null && amount > balance) {
          throw new GuardError(
            `Insufficient balance. Max sendable: ${balance.toFixed(Math.min(decimals, 6))}`,
          );
        }
      }

      const { message } = native
        ? await buildSolTransferMessage({
            fromAddress,
            toAddress,
            amountSol: amount,
          })
        : await buildSplTransferMessage({
            fromAddress,
            toAddress,
            mint: mint as string,
            rawAmount: toRawAmount(amount, decimals),
            decimals,
          });
      const compiled = compileTransaction(message);

      if (walletSource === 'bank') {
        const wallet = wallets?.[0];
        const walletAccount = wallet?.accounts?.find(
          (account) => account.address === fromAddress,
        );
        if (!walletAccount) {
          throw new Error(`Wallet account not found for address: ${fromAddress}`);
        }
        const wireBytes = getTransactionEncoder().encode(compiled);
        const hexString = Buffer.from(wireBytes).toString('hex');
        return signAndSendTransaction({
          walletAccount,
          unsignedTransaction: hexString,
          transactionType: 'TRANSACTION_TYPE_SOLANA',
          rpcUrl: EXPO_PUBLIC_SOLANA_RPC_URL,
        });
      }

      // Local ED25519 path for the stealth wallet. Pulled from walletKeyCache
      // (RAM 15 min TTL with Keychain fallback). Signed locally and broadcast
      // via RPC; we poll status because socket.io subs and Solana WSS are
      // separate channels we don't want to depend on for tx confirmation.
      const privateKeyB58 = await walletKeyCache.getPrivateKey();
      if (!privateKeyB58) {
        throw new Error('Stealth wallet key unavailable. Please re-import or unlock.');
      }
      const signer = await createSignerFromBase58(privateKeyB58);
      const signed = await signTransaction([signer.keyPair], compiled);
      assertIsTransactionWithinSizeLimit(signed);
      const signature = getSignatureFromTransaction(signed);

      const rpc = getRpc();
      const encodedTx = getBase64EncodedWireTransaction(signed);
      await rpc.sendTransaction(encodedTx, { encoding: 'base64' }).send();

      for (let i = 0; i < 30; i++) {
        const { value } = await rpc.getSignatureStatuses([signature]).send();
        const status = value[0];
        if (
          status?.confirmationStatus === 'confirmed' ||
          status?.confirmationStatus === 'finalized'
        ) {
          break;
        }
        if (status?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      walletKeyCache.touch();
      return signature;
    },
    onSuccess: (_txId, { fromAddress }) => {
      // Server-side history will catch up via socket; refetch as a safety net.
      queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(fromAddress) });
      queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(fromAddress) });
    },
  });
}
