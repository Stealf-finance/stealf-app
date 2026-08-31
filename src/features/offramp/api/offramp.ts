/**
 * Off-ramp API — backend `/api/offramp/*` (auth). Crypto→fiat cash-out via Noah,
 * architecture B: the user sends USDC from their OWN bank wallet to a Noah
 * deposit address, and Noah pays fiat out to their bank.
 *
 * Flow (each fn is one backend call):
 *   onboard   → hosted KYC URL
 *   channels  → payout channels (fees, limits, bank-form fields)
 *   prepare   → quote + validate the bank details → FormSessionID
 *   payout    → the crypto DEPOSIT ADDRESS the user sends USDC to
 *
 * `apiPost/apiGet` attach the Turnkey session token, unwrap `{ data }` (our
 * off-ramp controller returns bare objects, so the raw body passes through) and
 * throw `ApiError` on non-2xx. Every route 503s until Noah is configured.
 */
import { z } from 'zod';
import { apiGet, apiPost } from '@/src/services/api/client';

// ── onboard ──────────────────────────────────────────────────────────────
export const OnboardResultSchema = z
  .object({
    hostedUrl: z.string().url().optional(),
    status: z.string().optional(),
  })
  .passthrough();
export type OnboardResult = z.infer<typeof OnboardResultSchema>;

export async function onboard(
  token: string,
  body: { returnUrl: string; fiatCurrencies?: string[] },
): Promise<OnboardResult> {
  const raw = await apiPost('/api/offramp/onboard', token, body);
  return OnboardResultSchema.parse(raw);
}

// ── channels ─────────────────────────────────────────────────────────────
export const SellChannelSchema = z
  .object({
    ID: z.string(),
    PaymentMethodCategory: z.string().optional(),
    PaymentMethodType: z.string().optional(),
    FiatCurrency: z.string().optional(),
    Country: z.string().optional(),
    Rate: z.string().optional(),
    ProcessingSeconds: z.number().optional(),
    Limits: z
      .object({ MinLimit: z.string().optional(), MaxLimit: z.string().optional() })
      .passthrough()
      .optional(),
    FeeConfig: z
      .object({
        Fixed: z.string().optional(),
        Percentage: z.string().optional(),
        FiatCurrency: z.string().optional(),
      })
      .passthrough()
      .optional(),
    Calculated: z.object({ TotalFee: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();
export type SellChannel = z.infer<typeof SellChannelSchema>;

const ChannelsResponseSchema = z
  .object({ channels: z.array(SellChannelSchema).default([]) })
  .passthrough();

export async function listChannels(
  token: string,
  params: {
    cryptoCurrency: string;
    country?: string;
    fiatCurrency?: string;
    fiatAmount?: string;
  },
): Promise<SellChannel[]> {
  const qs = new URLSearchParams({ cryptoCurrency: params.cryptoCurrency });
  if (params.country) qs.set('country', params.country);
  if (params.fiatCurrency) qs.set('fiatCurrency', params.fiatCurrency);
  if (params.fiatAmount) qs.set('fiatAmount', params.fiatAmount);
  const raw = await apiGet(`/api/offramp/channels?${qs.toString()}`, token);
  return ChannelsResponseSchema.parse(raw).channels;
}

// ── prepare (quote + bank form) ──────────────────────────────────────────
export const PrepareQuoteSchema = z
  .object({
    FormSessionID: z.string(),
    TotalFee: z.string().optional(),
    CryptoAmountEstimate: z.string().optional(),
    CryptoAuthorizedAmount: z.string().optional(),
    FiatAmount: z.string().optional(),
    FiatCurrency: z.string().optional(),
    Rate: z.string().optional(),
    // Noah returns the next form step when more bank fields are required.
    NextStep: z
      .object({
        StepID: z.string().optional(),
        StepType: z.string().optional(),
        Schema: z.unknown().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type PrepareQuote = z.infer<typeof PrepareQuoteSchema>;

const PrepareResponseSchema = z.object({ quote: PrepareQuoteSchema }).passthrough();

export async function prepare(
  token: string,
  body: {
    channelId: string;
    cryptoCurrency: string;
    fiatAmount: string;
    form?: Record<string, unknown>;
    formSessionId?: string;
    quoted?: boolean;
  },
): Promise<PrepareQuote> {
  const raw = await apiPost('/api/offramp/prepare', token, body);
  return PrepareResponseSchema.parse(raw).quote;
}

// ── payout (returns the deposit address) ─────────────────────────────────
export const PayoutResultSchema = z
  .object({
    depositAddress: z.string().optional(),
    network: z.string().optional(),
    ruleId: z.string().optional(),
  })
  .passthrough();
export type PayoutResult = z.infer<typeof PayoutResultSchema>;

export async function payout(
  token: string,
  body: {
    cryptoCurrency: string;
    formSessionId: string;
    sourceAddress: string;
    network?: string;
    fiatAmount?: string;
    minCryptoAmount?: string;
  },
): Promise<PayoutResult> {
  const raw = await apiPost('/api/offramp/payout', token, body);
  return PayoutResultSchema.parse(raw);
}
