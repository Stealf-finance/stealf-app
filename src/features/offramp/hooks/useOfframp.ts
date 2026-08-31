/**
 * Off-ramp hooks — React Query wrappers over `api/offramp.ts` (3-layer rule).
 * These drive the cash-out wizard: onboard (KYC) → channels → prepare → payout.
 *
 * The on-chain USDC transfer leg is NOT here — it reuses the bank-wallet send
 * primitive (`useSendSimple`) in the screen, since that already does the Turnkey
 * sign+send+confirm path.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  onboard,
  listChannels,
  prepare,
  payout,
  type SellChannel,
  type PrepareQuote,
  type PayoutResult,
} from '../api/offramp';
import {
  OFFRAMP_CRYPTO_CURRENCY,
  OFFRAMP_NETWORK,
  OFFRAMP_MIN_AMOUNT_SLIPPAGE_BPS,
  isOfframpAvailable,
} from '../constants';

export const offrampQueries = {
  channels: (fiatAmount: string, fiatCurrency?: string, country?: string) =>
    ['offramp', 'channels', fiatAmount, fiatCurrency ?? '', country ?? ''] as const,
};

/** Start Noah hosted KYC and open the returned URL in the browser. */
export function useOfframpOnboard() {
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (opts: { returnUrl: string; fiatCurrencies?: string[] }) => {
      const token = session?.sessionToken;
      if (!token) throw new Error('Not authenticated');
      const res = await onboard(token, opts);
      if (res.hostedUrl) {
        const canOpen = await Linking.canOpenURL(res.hostedUrl);
        if (canOpen) await Linking.openURL(res.hostedUrl);
      }
      return res;
    },
  });
}

/** Payout channels for a fiat amount. Enabled only when the flow is live. */
export function useSellChannels(params: {
  fiatAmount: string;
  fiatCurrency?: string;
  country?: string;
}) {
  const { session } = useAuth();
  const token = session?.sessionToken ?? null;
  const amount = Number(params.fiatAmount);
  return useQuery<SellChannel[]>({
    queryKey: offrampQueries.channels(
      params.fiatAmount,
      params.fiatCurrency,
      params.country,
    ),
    queryFn: () =>
      listChannels(token!, {
        cryptoCurrency: OFFRAMP_CRYPTO_CURRENCY,
        fiatAmount: params.fiatAmount,
        fiatCurrency: params.fiatCurrency,
        country: params.country,
      }),
    enabled:
      isOfframpAvailable() && Boolean(token) && Number.isFinite(amount) && amount > 0,
    staleTime: 30_000,
  });
}

/** Quote + validate the bank details → FormSessionID. */
export function useOfframpPrepare() {
  const { session } = useAuth();
  return useMutation<
    PrepareQuote,
    Error,
    {
      channelId: string;
      fiatAmount: string;
      form?: Record<string, unknown>;
      formSessionId?: string;
      quoted?: boolean;
    }
  >({
    mutationFn: async (body) => {
      const token = session?.sessionToken;
      if (!token) throw new Error('Not authenticated');
      return prepare(token, {
        channelId: body.channelId,
        cryptoCurrency: OFFRAMP_CRYPTO_CURRENCY,
        fiatAmount: body.fiatAmount,
        form: body.form,
        formSessionId: body.formSessionId,
        quoted: body.quoted,
      });
    },
  });
}

/**
 * Wire the onchain-deposit payout rule and get the deposit address the user
 * sends USDC to. `sourceAddress` is the user's bank wallet.
 */
export function useOfframpPayout() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<
    PayoutResult,
    Error,
    {
      formSessionId: string;
      sourceAddress: string;
      fiatAmount?: string;
      minCryptoAmount?: string;
    }
  >({
    mutationFn: async (body) => {
      const token = session?.sessionToken;
      if (!token) throw new Error('Not authenticated');
      return payout(token, {
        cryptoCurrency: OFFRAMP_CRYPTO_CURRENCY,
        network: OFFRAMP_NETWORK,
        formSessionId: body.formSessionId,
        sourceAddress: body.sourceAddress,
        fiatAmount: body.fiatAmount,
        minCryptoAmount: body.minCryptoAmount,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['offramp', 'channels'] });
    },
  });
}

export { OFFRAMP_MIN_AMOUNT_SLIPPAGE_BPS };
