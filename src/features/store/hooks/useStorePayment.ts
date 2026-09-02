import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  checkOrderPayment,
  createOrder,
  orderFromConflict,
  orderQueries,
  type StorePaymentInstructions,
} from '../api/orders';
import {
  newClientReference,
  orderTransferAmount,
  paymentRefBytes,
} from '../lib/orders';
import {
  devNativeAmountRaw,
  estimatedAmountRaw,
  isNativeTestToken,
  resolvePaymentBlocker,
  resolvePaymentToken,
  type PaymentBlocker,
} from '../lib/payment';
import type { Denomination } from '../lib/denominations';
import type { StoreProduct } from '../api/curated';

export const BLOCKER_MESSAGE: Record<NonNullable<PaymentBlocker>, string> = {
  signer: "Your wallet isn't ready yet. Give it a moment, then try again.",
  stock: 'This card is out of stock right now.',
  token: __DEV__
    ? 'Shield some USDC or SOL first — the private balance is empty.'
    : 'You need USDC in your private balance to buy a gift card.',
  balance: 'Your private balance is too low for this amount.',
  fee: "Your wallet doesn't have enough SOL to pay network fees. Send a small amount of SOL (around 0.02), then try again.",
};

const RETRY_WITH_NEW_REFERENCE =
  'That order could not be reused. Swipe again to place a new one.';

export function useStorePayment(product: StoreProduct, amount: Denomination) {
  const { user, session } = useAuth();
  const wallet = user?.bankWallet ?? '';
  const sessionToken = session?.sessionToken ?? null;
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const umbra = useUmbra();
  const signerReady = useHasActiveSigner();
  const { data: encrypted } = useEncryptedBalances();
  const { data: publicBalance } = useBalance(wallet || null);

  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [order, setOrder] = useState<StorePaymentInstructions | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reused on retry so a repeat never mints a second Bitrefill invoice.
  const reference = useRef(newClientReference());
  useEffect(() => {
    reference.current = newClientReference();
  }, [product.id, amount.packageId, amount.value]);

  // Dev builds fall back to faucet SOL: a devnet wallet has no stablecoin.
  const token = useMemo(
    () => resolvePaymentToken(encrypted?.tokens, { allowNative: __DEV__ }),
    [encrypted],
  );

  const isNativeTest = token ? isNativeTestToken(token) : false;

  // The order quotes the real figure; this only gates the swipe.
  const estimatedRaw = useMemo(
    () => (token ? estimatedAmountRaw(amount, token) : undefined),
    [token, amount],
  );

  const publicSol =
    publicBalance?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;

  const blocker = resolvePaymentBlocker({
    signerReady,
    inStock: product.inStock,
    token,
    requiredRaw: estimatedRaw,
    publicSol,
  });

  const pay = useCallback(async () => {
    if (blocker || !token) return;
    setError(null);
    setSending(true);
    try {
      const placed = await createOrder(sessionToken, {
        ...(amount.packageId
          ? { packageId: amount.packageId }
          : { value: amount.value }),
        productId: product.id,
        quantity: 1,
        clientReference: reference.current,
      });
      setOrder(placed);

      // The SOL path pays a flat dev amount; no watcher credits it either way.
      const required = isNativeTest
        ? devNativeAmountRaw(token)
        : orderTransferAmount(placed);
      if (token.amountRaw < required) {
        setError(BLOCKER_MESSAGE.balance);
        return;
      }

      const result = await umbra.sendConfidential(
        toAddress(placed.treasuryUmbraAddress),
        toAddress(token.mint),
        required,
        paymentRefBytes(placed),
      );
      setSignature(String(result.signature));

      // "I've paid, go look." A 60s backstop finds it anyway, so never fatal.
      void checkOrderPayment(sessionToken, placed.id).catch(() => {});

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: encryptedBalancesQueries.byWalletPrefix(wallet),
        }),
        queryClient.invalidateQueries({
          queryKey: historyQueries.byAddress(wallet),
        }),
        queryClient.invalidateQueries({ queryKey: orderQueries.list() }),
      ]);

      posthog?.capture('store_order_paid', {
        product_id: product.id,
        amount_band: amountBand(placed.amountUsdc ?? amount.unitPrice),
      });
    } catch (err: any) {
      // A quoted order may still owe a refund, so its reference cannot be recycled.
      if (orderFromConflict(err)) {
        reference.current = newClientReference();
        setError(RETRY_WITH_NEW_REFERENCE);
        return;
      }
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
    isNativeTest,
    sessionToken,
    product.id,
    amount.packageId,
    amount.value,
    amount.unitPrice,
    umbra,
    queryClient,
    wallet,
    posthog,
  ]);

  return {
    pay,
    sending,
    signature,
    order,
    error,
    blocker,
    blockerMessage: blocker ? BLOCKER_MESSAGE[blocker] : null,
    token,
    isNativeTest,
  };
}
