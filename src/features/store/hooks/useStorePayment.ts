import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { solBalanceOf } from '@/src/features/send/lib/amount';
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
} from '../api/orders';
import {
  newClientReference,
  orderChargeDisplay,
  orderTransferAmount,
  paymentRefBytes,
} from '../lib/orders';
import {
  requiredAmountRaw,
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

/** A quote outlives the 30-minute payment window it describes, barely. */
const QUOTE_CACHE_MS = 30 * 60 * 1000;

export function useStorePayment(
  product: StoreProduct,
  amount: Denomination,
  open: boolean,
) {
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
  const [error, setError] = useState<string | null>(null);

  // Reused on retry so a repeat never mints a second Bitrefill invoice. It is
  // state, not a ref: changing it must re-key the quote below.
  const [reference, setReference] = useState(newClientReference);
  useEffect(() => {
    setReference(newClientReference());
  }, [product.id, amount.packageId, amount.value]);

  // Dev builds fall back to faucet SOL: a devnet wallet has no stablecoin.
  const token = useMemo(
    () => resolvePaymentToken(encrypted?.tokens, { allowNative: __DEV__ }),
    [encrypted],
  );

  const isNativeTest = token ? isNativeTestToken(token) : false;
  const publicSol = solBalanceOf(publicBalance?.tokens);

  // Nothing is quoted for a wallet that could not pay anyway — an invoice
  // minted here would only ever expire. The balance itself cannot gate this:
  // it is the quote that says how much is needed.
  const preQuoteBlocker = resolvePaymentBlocker({
    signerReady,
    inStock: product.inStock,
    token,
    requiredRaw: undefined,
    publicSol,
  });

  /**
   * The quote IS the order: Bitrefill prices the invoice, so the only way to
   * show the exact USDC charge before the swipe is to create it on open. The
   * backend is idempotent on `clientReference`, so a retry or a remount
   * returns the same row instead of minting a second invoice — which is what
   * makes it safe to run this as a query. It must never refetch on its own.
   */
  const quoteQuery = useQuery({
    queryKey: orderQueries.quote(reference),
    queryFn: () =>
      createOrder(sessionToken, {
        ...(amount.packageId
          ? { packageId: amount.packageId }
          : { value: amount.value }),
        productId: product.id,
        quantity: 1,
        clientReference: reference,
      }),
    enabled: open && Boolean(sessionToken) && !preQuoteBlocker,
    retry: false,
    staleTime: Infinity,
    gcTime: QUOTE_CACHE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const order = quoteQuery.data ?? null;

  // The quote is the only place the real price appears — log what Bitrefill
  // actually charged next to the card's face value, to tell a unit bug from a
  // pricing one.
  useEffect(() => {
    if (__DEV__ && order) {
      console.log('[store/quote]', {
        // If `displayed` is not what the sheet shows, the divisor is wrong;
        // if it is, the price itself came in that way from Bitrefill.
        displayed: orderChargeDisplay(order),
        tokenDecimals: token?.decimals,
        productId: order.productId,
        faceValue: `${order.value ?? amount.value} ${order.currency ?? product.currency ?? '?'}`,
        amountRaw: order.amountRaw,
        amountUsdc: order.amountUsdc,
        cost: order.cost,
        costCurrency: order.costCurrency,
        packageId: order.packageId ?? amount.packageId,
      });
    }
  }, [
    order,
    amount.value,
    amount.packageId,
    product.currency,
    token?.decimals,
  ]);

  // A conflict means the reference is spent — a fresh one re-keys the quote.
  useEffect(() => {
    if (quoteQuery.error && orderFromConflict(quoteQuery.error)) {
      setReference(newClientReference());
    }
  }, [quoteQuery.error]);

  const quotedRaw = order ? orderTransferAmount(order) : undefined;
  const requiredRaw = useMemo(
    () => (token ? requiredAmountRaw(token, quotedRaw) : undefined),
    [token, quotedRaw],
  );

  const blocker = resolvePaymentBlocker({
    signerReady,
    inStock: product.inStock,
    token,
    requiredRaw,
    publicSol,
  });

  const pay = useCallback(async () => {
    // The quote is what is being paid — no quote, nothing to pay.
    if (blocker || !token || !order || requiredRaw === undefined) return;
    setError(null);
    setSending(true);
    try {
      const placed = order;
      const required = requiredRaw;
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
        // `amountUsdc` is optional on the response; `amountRaw` never is.
        amount_band: amountBand(orderChargeDisplay(placed)),
      });
    } catch (err: any) {
      // A quoted order may still owe a refund, so its reference cannot be recycled.
      if (orderFromConflict(err)) {
        setReference(newClientReference());
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
    order,
    requiredRaw,
    sessionToken,
    product.id,
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
    // Also true while the balances the quote waits on are still landing.
    quoting:
      quoteQuery.isFetching ||
      (open && !preQuoteBlocker && !order && !quoteQuery.error),
    quoteFailed: Boolean(quoteQuery.error) && !quoteQuery.isFetching,
    error,
    blocker,
    blockerMessage: blocker ? BLOCKER_MESSAGE[blocker] : null,
    token,
    isNativeTest,
  };
}
