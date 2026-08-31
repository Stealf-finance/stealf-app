/**
 * CashOutScreen — crypto→fiat cash-out via Noah.
 *
 * Flow: (KYC once) → enter fiat amount + bank details → we pick the cheapest
 * channel, quote it, and wire an onchain-deposit payout rule → the user signs a
 * USDC transfer from their BANK wallet to Noah's deposit address → Noah pays
 * fiat to the bank.
 *
 * The whole screen is gated by `isOfframpAvailable()`. It's a MAINNET-only
 * feature (real USDC → real fiat) and the backend 503s until Noah is
 * provisioned, so until launch this renders a "coming at mainnet" panel and
 * never calls the API.
 *
 * ⚠️ On-chain leg: the USDC transfer reuses `useSendSimple` (bank Turnkey
 * sign+send+confirm). That primitive currently builds + confirms against the
 * app's DEVNET RPC (see `getRpc()` / app-rpc-cluster gotcha). Before enabling
 * this flow the transfer must be threaded onto a mainnet RPC — same rework the
 * private swap needed. This is why `OFFRAMP_ENABLED` stays false.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import { mono, sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { txPalette } from '@/src/design-system/palettes';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getEnv } from '@/src/services/env';
import { ApiError } from '@/src/services/api/errors';
import { useSendSimple } from '@/src/features/send/hooks/useSendSimple';
import {
  useOfframpOnboard,
  useSellChannels,
  useOfframpPrepare,
  useOfframpPayout,
} from '../hooks/useOfframp';
import { pickBestChannel, isWithinLimits, computeMinCryptoAmount } from '../lib/offramp';
import {
  isOfframpAvailable,
  OFFRAMP_USDC_MINT,
  OFFRAMP_USDC_DECIMALS,
  OFFRAMP_MIN_AMOUNT_SLIPPAGE_BPS,
} from '../constants';

type Step = 'form' | 'deposit' | 'done';

const FIAT = 'EUR';
const accent = txPalette('silver').accent;

const label = (t: string) => (
  <Text
    style={[
      sansation,
      {
        fontSize: 9,
        letterSpacing: 2.4,
        textTransform: 'uppercase',
        color: T.inkFaint,
        fontWeight: '700',
        marginBottom: 8,
      },
    ]}
  >
    {t}
  </Text>
);

export function CashOutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const bankWallet = user?.bankWallet ?? '';

  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [holder, setHolder] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<{
    address: string;
    cryptoAmount: string;
    fee?: string;
  } | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const available = isOfframpAvailable();

  const onboard = useOfframpOnboard();
  const channels = useSellChannels({ fiatAmount: amount, fiatCurrency: FIAT });
  const prepare = useOfframpPrepare();
  const payout = useOfframpPayout();
  const sendSimple = useSendSimple();

  const best = useMemo(
    () => (channels.data ? pickBestChannel(channels.data, FIAT) : null),
    [channels.data],
  );

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const withinLimits = best ? isWithinLimits(best, amountNum) : true;
  const formValid =
    amountValid && withinLimits && iban.trim().length >= 15 && holder.trim().length >= 2;
  const busy = prepare.isPending || payout.isPending;

  const returnUrl = `${getEnv().EXPO_PUBLIC_API_URL}/api/offramp/return`;

  async function handleGetDeposit() {
    setError(null);
    if (!best) {
      setError('No payout channel available for this amount.');
      return;
    }
    if (!bankWallet) {
      setError('Bank wallet unavailable.');
      return;
    }
    try {
      const quote = await prepare.mutateAsync({
        channelId: best.ID,
        fiatAmount: amount,
        form: { IBAN: iban.trim(), AccountHolderName: holder.trim() },
        quoted: true,
      });
      const cryptoAmount =
        quote.CryptoAuthorizedAmount ?? quote.CryptoAmountEstimate ?? '';
      const res = await payout.mutateAsync({
        formSessionId: quote.FormSessionID,
        sourceAddress: bankWallet,
        fiatAmount: amount,
        minCryptoAmount: computeMinCryptoAmount(
          cryptoAmount,
          OFFRAMP_MIN_AMOUNT_SLIPPAGE_BPS,
        ),
      });
      if (!res.depositAddress) {
        setError('Noah did not return a deposit address.');
        return;
      }
      setDeposit({
        address: res.depositAddress,
        cryptoAmount,
        fee: quote.TotalFee,
      });
      setStep('deposit');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 503
            ? 'Cash-out is not available yet.'
            : 'Off-ramp request failed. Check your details and try again.'
          : e instanceof Error
            ? e.message
            : 'Something went wrong.',
      );
    }
  }

  async function handleSend() {
    if (!deposit || !bankWallet) return;
    setError(null);
    try {
      const sig = await sendSimple.mutateAsync({
        fromAddress: bankWallet,
        toAddress: deposit.address,
        amount: Number(deposit.cryptoAmount),
        mint: OFFRAMP_USDC_MINT,
        decimals: OFFRAMP_USDC_DECIMALS,
        walletSource: 'bank',
      });
      setTxSig(sig);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The transfer failed.');
    }
  }

  return (
    <CenterGlow tone="silver" flat>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackBtn onPress={() => router.back()} />
        <Text
          style={[
            sansation,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 28,
              fontWeight: '600',
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          Cash out
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {!available ? (
        <ComingSoon insetsBottom={insets.bottom} />
      ) : step === 'done' ? (
        <DonePanel
          amount={amount}
          txSig={txSig}
          onDone={() => router.back()}
          insetsBottom={insets.bottom}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 28,
            gap: 22,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              sansation,
              { fontSize: 13, color: T.inkDim, lineHeight: 19, marginTop: 4 },
            ]}
          >
            Withdraw USDC to your bank account. We convert it to {FIAT} and pay it
            out to the IBAN below.
          </Text>

          {step === 'form' ? (
            <>
              {/* Amount */}
              <View>
                {label(`Amount (${FIAT})`)}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: T.hairline,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <TextInput
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={T.inkFaint}
                    style={[
                      mono,
                      { flex: 1, fontSize: 26, color: T.ink, paddingVertical: 16 },
                    ]}
                  />
                  <Text style={[sansation, { fontSize: 16, color: T.inkDim }]}>
                    {FIAT}
                  </Text>
                </View>
                <ChannelHint
                  loading={channels.isFetching}
                  best={best}
                  amountValid={amountValid}
                  withinLimits={withinLimits}
                />
              </View>

              {/* Bank details */}
              <View>
                {label('IBAN')}
                <Field
                  value={iban}
                  onChangeText={(t) => setIban(t.toUpperCase())}
                  placeholder="FR76 ****"
                  autoCapitalize="characters"
                />
              </View>
              <View>
                {label('Account holder')}
                <Field
                  value={holder}
                  onChangeText={setHolder}
                  placeholder="Full name"
                  autoCapitalize="words"
                />
              </View>

              <Pressable
                onPress={() =>
                  onboard.mutate({ returnUrl, fiatCurrencies: [FIAT] })
                }
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Icons.shield size={14} color={T.inkDim} />
                <Text
                  style={[
                    sansation,
                    { fontSize: 12, color: T.inkDim, fontWeight: '600' },
                  ]}
                >
                  {onboard.isPending ? 'Opening…' : 'Verify identity (one-time)'}
                </Text>
              </Pressable>

              {error ? <ErrorNote text={error} /> : null}

              <PrimaryButton
                label="Get deposit address"
                busy={busy}
                disabled={!formValid || busy}
                onPress={handleGetDeposit}
              />
            </>
          ) : null}

          {step === 'deposit' && deposit ? (
            <DepositPanel
              deposit={deposit}
              fiat={`${amount} ${FIAT}`}
              sending={sendSimple.isPending}
              error={error}
              onSend={handleSend}
            />
          ) : null}
        </ScrollView>
      )}
    </CenterGlow>
  );
}

function Field(props: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'characters' | 'words';
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor={T.inkFaint}
      autoCapitalize={props.autoCapitalize}
      autoCorrect={false}
      style={[
        sansation,
        {
          fontSize: 15,
          color: T.ink,
          borderWidth: 1,
          borderColor: T.hairline,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 15,
          backgroundColor: 'rgba(255,255,255,0.03)',
        },
      ]}
    />
  );
}

function ChannelHint(props: {
  loading: boolean;
  best: ReturnType<typeof pickBestChannel>;
  amountValid: boolean;
  withinLimits: boolean;
}) {
  if (!props.amountValid) return null;
  let text = '';
  if (props.loading) text = 'Finding the best payout route…';
  else if (!props.best) text = 'No payout route for this amount.';
  else if (!props.withinLimits) {
    const min = props.best.Limits?.MinLimit;
    const max = props.best.Limits?.MaxLimit;
    text = `Amount must be between ${min ?? '—'} and ${max ?? '—'} ${props.best.FiatCurrency ?? ''}.`;
  } else {
    const fee = props.best.Calculated?.TotalFee;
    text = fee
      ? `${props.best.PaymentMethodType ?? 'Bank transfer'} · fee ${fee} ${props.best.FiatCurrency ?? ''}`
      : `${props.best.PaymentMethodType ?? 'Bank transfer'}`;
  }
  return (
    <Text
      style={[
        sansation,
        {
          fontSize: 11,
          color: props.best && props.withinLimits ? T.inkDim : T.error,
          marginTop: 8,
        },
      ]}
    >
      {text}
    </Text>
  );
}

function DepositPanel(props: {
  deposit: { address: string; cryptoAmount: string; fee?: string };
  fiat: string;
  sending: boolean;
  error: string | null;
  onSend: () => void;
}) {
  const short = `${props.deposit.address.slice(0, 10)}…${props.deposit.address.slice(-8)}`;
  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: T.hairline,
          borderRadius: 20,
          padding: 18,
          gap: 14,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      >
        <Row k="You send" v={`${props.deposit.cryptoAmount} USDC`} />
        <Row k="You receive" v={props.fiat} accent />
        {props.deposit.fee ? <Row k="Fee" v={props.deposit.fee} /> : null}
        <View style={{ height: 1, backgroundColor: T.hairline }} />
        <Pressable
          onPress={() => Clipboard.setStringAsync(props.deposit.address)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={[mono, { fontSize: 13, color: T.ink }]}>{short}</Text>
          <Icons.copy size={14} color={T.inkDim} />
        </Pressable>
      </View>

      <Text
        style={[
          sansation,
          { fontSize: 11, color: T.inkFaint, lineHeight: 16, textAlign: 'center' },
        ]}
      >
        Confirm to send USDC from your bank wallet to Noah. Fiat lands in your
        account once the deposit clears.
      </Text>

      {props.error ? <ErrorNote text={props.error} /> : null}

      <PrimaryButton
        label="Confirm & send USDC"
        busy={props.sending}
        disabled={props.sending}
        onPress={props.onSend}
      />
    </View>
  );
}

function Row(props: { k: string; v: string; accent?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text style={[sansation, { fontSize: 13, color: T.inkDim }]}>{props.k}</Text>
      <Text
        style={[
          sansation,
          { fontSize: 15, color: props.accent ? accent : T.ink, fontWeight: '600' },
        ]}
      >
        {props.v}
      </Text>
    </View>
  );
}

function PrimaryButton(props: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      style={{
        paddingVertical: 16,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: props.disabled ? 'rgba(255,255,255,0.05)' : accent,
        opacity: props.disabled && !props.busy ? 0.5 : 1,
      }}
    >
      {props.busy ? <ActivityIndicator size="small" color="#0a0a0a" /> : null}
      <Text
        style={[
          sansation,
          {
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: '700',
            color: props.disabled ? T.inkDim : '#0a0a0a',
          },
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(209,96,74,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(209,96,74,0.4)',
      }}
    >
      <Icons.info size={14} color={T.error} />
      <Text style={[sansation, { flex: 1, fontSize: 12, color: T.error }]}>
        {text}
      </Text>
    </View>
  );
}

function ComingSoon({ insetsBottom }: { insetsBottom: number }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingBottom: insetsBottom + 40,
        gap: 16,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: T.hairline,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      >
        <Icons.bank size={26} color={T.inkDim} />
      </View>
      <Text
        style={[
          sansation,
          { fontSize: 20, color: T.ink, fontWeight: '600', textAlign: 'center' },
        ]}
      >
        Cash-out is coming at mainnet
      </Text>
      <Text
        style={[
          sansation,
          { fontSize: 13, color: T.inkDim, lineHeight: 20, textAlign: 'center' },
        ]}
      >
        Withdraw USDC straight to your bank. We&apos;re finishing the bank rail —
        it goes live with the mainnet launch.
      </Text>
    </View>
  );
}

function DonePanel(props: {
  amount: string;
  txSig: string | null;
  onDone: () => void;
  insetsBottom: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 34,
        paddingBottom: props.insetsBottom + 24,
        gap: 16,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(126,166,136,0.14)',
          borderWidth: 1,
          borderColor: 'rgba(126,166,136,0.5)',
        }}
      >
        <Icons.check size={28} color={T.green} strokeWidth={2.4} />
      </View>
      <Text
        style={[
          sansation,
          { fontSize: 20, color: T.ink, fontWeight: '600', textAlign: 'center' },
        ]}
      >
        Withdrawal sent
      </Text>
      <Text
        style={[
          sansation,
          { fontSize: 13, color: T.inkDim, lineHeight: 20, textAlign: 'center' },
        ]}
      >
        Your USDC is on its way to Noah. {props.amount} {FIAT} will arrive in your
        bank once the deposit settles — you&apos;ll get a notification.
      </Text>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={props.onDone}
        accessibilityRole="button"
        style={{
          alignSelf: 'stretch',
          paddingVertical: 16,
          borderRadius: 100,
          alignItems: 'center',
          backgroundColor: accent,
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: '#0a0a0a',
            },
          ]}
        >
          Done
        </Text>
      </Pressable>
    </View>
  );
}
