/**
 * useFiatOnRamp — buy crypto with fiat via Turnkey's native on-ramp.
 *
 * Turnkey's `initFiatOnRamp` activity (signed by the active session) returns a
 * provider widget URL (MoonPay / Coinbase). We open it, then poll
 * `getOnRampTransactionStatus` until the purchase settles and refresh the bank
 * balance. The crypto is delivered straight to `walletAddress`.
 *
 * Defaults are tuned for Stealf: Solana network, USDC, MoonPay, EUR. Sandbox
 * mode is on in dev (mocked KYC + test cards).
 *
 * Note: this only covers ON-ramp (fiat → crypto). Turnkey has no off-ramp
 * activity — cash-out goes through a separate rail.
 */
import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import {
  FiatOnRampBlockchainNetwork,
  FiatOnRampCryptoCurrency,
  FiatOnRampCurrency,
  FiatOnRampPaymentMethod,
  FiatOnRampProvider,
} from '@turnkey/sdk-types';
import { balanceQueries } from '@/src/features/bank/api/balance';

export type OnRampStatus =
  | 'idle'
  | 'initiating'
  | 'awaiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60_000;

export interface AddFundsOptions {
  /** Destination Solana address (bank or stealth wallet). */
  walletAddress: string;
  /** Optional preset fiat amount (must be > 20); omit to let the user choose. */
  fiatAmount?: string;
  provider?: FiatOnRampProvider;
  crypto?: FiatOnRampCryptoCurrency;
  fiatCurrency?: FiatOnRampCurrency;
  paymentMethod?: FiatOnRampPaymentMethod;
}

export function useFiatOnRamp() {
  const { httpClient, session } = useTurnkey();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OnRampStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const addFunds = useCallback(
    async (opts: AddFundsOptions) => {
      if (!httpClient) throw new Error('Turnkey client not ready');
      if (!opts.walletAddress) throw new Error('Wallet address required');

      setError(null);
      setStatus('initiating');
      stopPolling();

      try {
        const res = await httpClient.initFiatOnRamp({
          organizationId: session?.organizationId,
          onrampProvider: opts.provider ?? FiatOnRampProvider.MOONPAY,
          walletAddress: opts.walletAddress,
          network: FiatOnRampBlockchainNetwork.SOLANA,
          cryptoCurrencyCode: opts.crypto ?? FiatOnRampCryptoCurrency.USDC,
          // Omitted unless explicitly set → the provider widget lets the user
          // pick from every fiat currency it supports in their region.
          fiatCurrencyCode: opts.fiatCurrency,
          fiatCurrencyAmount: opts.fiatAmount,
          paymentMethod:
            opts.paymentMethod ?? FiatOnRampPaymentMethod.CREDIT_DEBIT_CARD,
          sandboxMode: __DEV__,
        });

        if (!res.onRampUrl) throw new Error('No on-ramp URL returned');
        const canOpen = await Linking.canOpenURL(res.onRampUrl);
        if (!canOpen) throw new Error('Unable to open the on-ramp widget');
        await Linking.openURL(res.onRampUrl);

        setStatus('awaiting');
        pollStatus(res.onRampTransactionId, opts.walletAddress, Date.now());
        return res;
      } catch (err) {
        setStatus('failed');
        setError(err instanceof Error ? err.message : 'On-ramp failed');
        throw err;
      }
    },
    // pollStatus is stable via the same deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [httpClient, session, stopPolling],
  );

  const pollStatus = useCallback(
    (transactionId: string, walletAddress: string, startedAt: number) => {
      const tick = async () => {
        if (!httpClient || Date.now() - startedAt > POLL_TIMEOUT_MS) {
          stopPolling();
          return;
        }
        try {
          const { transactionStatus } =
            await httpClient.getOnRampTransactionStatus({
              transactionId,
              refresh: true,
            });
          const s = (transactionStatus ?? '').toUpperCase();
          if (s === 'COMPLETED') {
            setStatus('completed');
            queryClient.invalidateQueries({
              queryKey: balanceQueries.byAddress(walletAddress),
            });
            stopPolling();
            return;
          }
          if (s === 'FAILED') {
            setStatus('failed');
            stopPolling();
            return;
          }
          if (s === 'CANCELLED') {
            setStatus('cancelled');
            stopPolling();
            return;
          }
        } catch {
          // transient — keep polling until the timeout
        }
        pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      };
      pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    },
    [httpClient, queryClient, stopPolling],
  );

  return { addFunds, status, error, stopPolling };
}
