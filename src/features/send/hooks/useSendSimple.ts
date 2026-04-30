import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { getTransactionEncoder } from '@solana/kit';
import { compileTransaction } from '@/src/services/solana/kit';
import { getEnv } from '@/src/services/env';
import {
  guardTransaction,
  type GuardResult,
} from '@/src/services/solana/transactionsGuard';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { buildSolTransferMessage } from '../lib/buildTransfer';

export interface SendSimpleParams {
  fromAddress: string;
  toAddress: string;
  amountSol: number;
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

      const wallet = wallets?.[0];
      const walletAccount = wallet?.accounts?.find(
        (account) => account.address === fromAddress,
      );
      if (!walletAccount) {
        throw new Error(`Wallet account not found for address: ${fromAddress}`);
      }

      const { message } = await buildSolTransferMessage({
        fromAddress,
        toAddress,
        amountSol,
      });
      const compiled = compileTransaction(message);
      const wireBytes = getTransactionEncoder().encode(compiled);
      const hexString = Buffer.from(wireBytes).toString('hex');

      const txId = await signAndSendTransaction({
        walletAccount,
        unsignedTransaction: hexString,
        transactionType: 'TRANSACTION_TYPE_SOLANA',
        rpcUrl: EXPO_PUBLIC_SOLANA_RPC_URL,
      });

      return txId;
    },
    onSuccess: (_txId, { fromAddress }) => {
      // Server-side history will catch up via socket; refetch as a safety net.
      queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(fromAddress) });
      queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(fromAddress) });
    },
  });
}
