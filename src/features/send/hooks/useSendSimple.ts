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
  toSignature,
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
import {
  confirmSignature,
  type FetchSignatureStatus,
} from '../lib/confirmSignature';

export type WalletSource = 'bank' | 'stealth';

export interface SendSimpleParams {
  fromAddress: string;
  toAddress: string;
  amount: number;
  mint: string | null;
  decimals: number;
  walletSource: WalletSource;
  balance?: number;
}

export class GuardError extends Error {
  isGuard = true;
  constructor(message: string) {
    super(message);
    this.name = 'GuardError';
  }
}

/** Reads a signature status off the RPC, for `confirmSignature` to poll. */
function makeStatusFetcher(): FetchSignatureStatus {
  const rpc = getRpc();
  return async (sig) => {
    const { value } = await rpc.getSignatureStatuses([toSignature(sig)]).send();
    return value[0] ?? null;
  };
}

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
        if (!guard.valid)
          throw new GuardError(guard.error ?? 'Invalid transaction');
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
          throw new Error(
            `Wallet account not found for address: ${fromAddress}`,
          );
        }
        const wireBytes = getTransactionEncoder().encode(compiled);
        const hexString = Buffer.from(wireBytes).toString('hex');
        const bankSignature = await signAndSendTransaction({
          walletAccount,
          unsignedTransaction: hexString,
          transactionType: 'TRANSACTION_TYPE_SOLANA',
          rpcUrl: EXPO_PUBLIC_SOLANA_RPC_URL,
        });
        // Turnkey resolves once the transaction is broadcast, not once it is
        // settled — so this path has to wait too.
        await confirmSignature(bankSignature, makeStatusFetcher());
        return bankSignature;
      }

      const privateKeyB58 = await walletKeyCache.getPrivateKey();
      if (!privateKeyB58) {
        throw new Error('Wallet key unavailable. Please re-import or unlock.');
      }
      const signer = await createSignerFromBase58(privateKeyB58);
      const signed = await signTransaction([signer.keyPair], compiled);
      assertIsTransactionWithinSizeLimit(signed);
      const signature = getSignatureFromTransaction(signed);

      const rpc = getRpc();
      const encodedTx = getBase64EncodedWireTransaction(signed);
      await rpc.sendTransaction(encodedTx, { encoding: 'base64' }).send();

      // Previously this loop fell through to `return signature` on timeout, so
      // a dropped transfer was reported as a completed one.
      await confirmSignature(signature, makeStatusFetcher());

      walletKeyCache.touch();
      return signature;
    },
    onSuccess: (_txId, { fromAddress }) => {
      // Server-side history will catch up via socket; refetch as a safety net.
      queryClient.invalidateQueries({
        queryKey: balanceQueries.byAddress(fromAddress),
      });
      queryClient.invalidateQueries({
        queryKey: historyQueries.byAddress(fromAddress),
      });
    },
  });
}
