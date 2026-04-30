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
import { buildSolTransferMessage } from '../lib/buildTransfer';

export type WalletSource = 'bank' | 'stealth';

export interface SendSimpleParams {
  fromAddress: string;
  toAddress: string;
  amountSol: number;
  /** Selects the signer: Turnkey for bank, local ED25519 for stealth. */
  walletSource: WalletSource;
  /** Optional balance for pre-flight `guardTransaction` (recommended). */
  balanceSol?: number;
}

export class GuardError extends Error {
  isGuard = true;
  constructor(message: string) {
    super(message);
    this.name = 'GuardError';
  }
}

/**
 * Sends a SOL transfer signed by the Turnkey-managed bank wallet.
 * Returns the transaction signature on confirmation.
 */
export function useSendSimple() {
  const { signAndSendTransaction, wallets } = useTurnkey();
  const queryClient = useQueryClient();
  const { EXPO_PUBLIC_SOLANA_RPC_URL } = getEnv();

  return useMutation({
    mutationFn: async ({
      fromAddress,
      toAddress,
      amountSol,
      walletSource,
      balanceSol,
    }: SendSimpleParams): Promise<string> => {
      const guard: GuardResult = guardTransaction({
        fromAddress,
        toAddress,
        amount: amountSol.toString(),
        amountSOL: amountSol,
        balanceSOL: balanceSol,
      });
      if (!guard.valid) throw new GuardError(guard.error ?? 'Invalid transaction');

      const { message } = await buildSolTransferMessage({
        fromAddress,
        toAddress,
        amountSol,
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
