import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { historyQueries } from '@/src/features/bank/api/history';
import { useUmbra } from '@/src/features/umbra/hooks/useUmbra';
import { useHasActiveSigner } from '@/src/features/umbra/hooks/useHasActiveSigner';
import {
  encryptedBalancesQueries,
  useEncryptedBalances,
} from '@/src/features/umbra/hooks/useEncryptedBalances';
import { toAddress } from '@/src/services/solana/kit';
import { amountBand } from '@/src/services/observability/scrub';
import {
  isNativeTestToken,
  paymentAmountRaw,
  paymentHumanAmount,
  resolvePaymentBlocker,
  resolvePaymentToken,
  STORE_TREASURY_ADDRESS,
  type PaymentBlocker,
} from '../lib/payment';
import type { Denomination } from '../lib/denominations';
import type { StoreProduct } from '../api/curated';

export const BLOCKER_MESSAGE: Record<NonNullable<PaymentBlocker>, string> = {
  signer: "Your wallet isn't ready yet. Give it a moment, then try again.",
  stock: 'This card is out of stock right now.',
  token: __DEV__
    ? 'Shield some USDC or SOL first — the encrypted balance is empty.'
    : 'You need USDC in your encrypted balance to buy a gift card.',
  balance: 'Your encrypted balance is too low for this amount.',
  fee: "Your wallet doesn't have enough SOL to pay network fees. Send a small amount of SOL (around 0.02), then try again.",
};

export function useStorePayment(product: StoreProduct, amount: Denomination) {
  const { user } = useAuth();
  const wallet = user?.bankWallet ?? '';
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const umbra = useUmbra();
  const signerReady = useHasActiveSigner();
  const { data: encrypted } = useEncryptedBalances();
  const { data: publicBalance } = useBalance(wallet || null);

  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dev builds fall back to native SOL: a devnet wallet has no stablecoin.
  const token = useMemo(
    () => resolvePaymentToken(encrypted?.tokens, { allowNative: __DEV__ }),
    [encrypted],
  );

  const requiredRaw = useMemo(
    () => (token ? paymentAmountRaw(amount, token) : undefined),
    [token, amount],
  );

  const publicSol =
    publicBalance?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;

  const blocker = resolvePaymentBlocker({
    signerReady,
    inStock: product.inStock,
    token,
    requiredRaw,
    publicSol,
  });

  const pay = useCallback(async () => {
    if (blocker || !token || requiredRaw === undefined) return;
    setError(null);
    setSending(true);
    try {
      const result = await umbra.sendConfidential(
        toAddress(STORE_TREASURY_ADDRESS),
        toAddress(token.mint),
        requiredRaw,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: encryptedBalancesQueries.byWalletPrefix(wallet),
        }),
        queryClient.invalidateQueries({
          queryKey: historyQueries.byAddress(wallet),
        }),
      ]);
      posthog?.capture('store_payment_sent', {
        product_id: product.id,
        amount_band: amountBand(amount.unitPrice),
      });
      setSignature(String(result.signature));
    } catch (err: any) {
      setError(
        err?.userMessage ||
          (err instanceof Error ? err.message : 'Payment failed.'),
      );
    } finally {
      setSending(false);
    }
  }, [
    blocker,
    token,
    requiredRaw,
    umbra,
    queryClient,
    wallet,
    posthog,
    product.id,
    amount.unitPrice,
  ]);

  return {
    pay,
    sending,
    signature,
    error,
    blocker,
    blockerMessage: blocker ? BLOCKER_MESSAGE[blocker] : null,
    token,
    requiredRaw,
    humanAmount: token ? paymentHumanAmount(amount, token) : null,
    isNativeTest: token ? isNativeTestToken(token) : false,
  };
}
