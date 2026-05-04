import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  applyAmountKey,
  maxSpendableSol,
  PROTOCOL_FEE_RATE,
  protocolFeeSol,
  SOL_DECIMALS,
} from '@/src/features/send/lib/amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { CloseBtn } from '@/src/design-system/primitives/CloseBtn';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { DirectionRow } from '@/src/features/send/components/DirectionRow';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_MINT } from '@/src/constants/solana';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import {
  useShieldedSolBalance,
  shieldedBalanceQueries,
} from '@/src/features/stealth/hooks/useShieldedSolBalance';
import {
  useUmbra,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
} from '@/src/features/stealth/hooks/useUmbra';
import { pendingClaimsForCashQueries } from '@/src/features/stealth/hooks/usePendingClaimsForCash';
import { pendingClaimsQueries } from '@/src/features/stealth/hooks/usePendingClaims';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';
import type { PendingOpKind } from '@/src/components/pending-ops/types';

function kindForDirection(d: MoveDirection): PendingOpKind {
  switch (d) {
    case 'bank-to-shielded':
      return 'move-bank-to-shielded';
    case 'shielded-to-bank':
      return 'move-shielded-to-bank';
    case 'stealth-to-bank':
      return 'move-stealth-to-bank';
  }
}

export type MoveDirection =
  | 'bank-to-shielded'
  | 'shielded-to-bank'
  | 'stealth-to-bank';

type DirectionConfig = {
  title: string;
  fromLabel: string;
  toLabel: string;
  cta: string;
};

const CONFIG: Record<MoveDirection, DirectionConfig> = {
  'bank-to-shielded': {
    title: 'Move to private',
    fromLabel: 'Bank wallet',
    toLabel: 'Shielded pool',
    cta: 'Slide to move',
  },
  'shielded-to-bank': {
    title: 'Move to bank',
    fromLabel: 'Shielded pool',
    toLabel: 'Bank wallet',
    cta: 'Slide to move',
  },
  'stealth-to-bank': {
    title: 'Move to bank',
    fromLabel: 'Stealth wallet',
    toLabel: 'Bank wallet',
    cta: 'Slide to move',
  },
};

function formatSolBalance(sol: number): string {
  if (sol === 0) return '0';
  return sol.toFixed(4).replace(/\.?0+$/, '');
}

export function MoveFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ direction?: string }>();
  const direction = (params.direction as MoveDirection) ?? 'bank-to-shielded';
  const config = CONFIG[direction];

  // Tone follows the source side: silver when moving out of a public wallet,
  // gold when moving out of the shielded pool. Anchors the screen on where
  // the funds are leaving from.
  const tone: Tone = direction === 'shielded-to-bank' ? 'gold' : 'silver';
  const palette = txPalette(tone);
  // Source-side asset symbol — WSOL when leaving the encrypted balance,
  // SOL otherwise. Keeps the user oriented on what they're spending.
  const assetSymbol = direction === 'shielded-to-bank' ? 'WSOL' : 'SOL';

  const [amount, setAmount] = useState('0');

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  const { data: solPrice } = useSolPrice();
  const rate = typeof solPrice === 'number' && solPrice > 0 ? solPrice : 0;

  const {
    wrap,
    getStealthClient,
    getBankClient,
    ensureRegistered,
  } = useUmbra();

  const { data: bankBalanceData } = useBalance(
    direction === 'bank-to-shielded' ? user?.bankWallet ?? null : null,
  );
  const { data: stealthBalanceData } = useBalance(
    direction === 'stealth-to-bank' ? user?.stealfWallet ?? null : null,
  );
  const { data: shielded } = useShieldedSolBalance();

  let sourceSol = 0;
  if (direction === 'bank-to-shielded') {
    sourceSol = bankBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  } else if (direction === 'stealth-to-bank') {
    sourceSol = stealthBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  } else {
    sourceSol = shielded?.sol ?? 0;
  }
  const balanceLabel = formatSolBalance(sourceSol);

  // The source wallet pays its own fees only when source funds and fee-payer
  // wallet are the same bucket. For shielded-to-bank, fees come out of the
  // stealth public ATA while the source is encrypted balance — different
  // buckets, no reserve needed.
  const sourcePaysFees =
    direction === 'bank-to-shielded' || direction === 'stealth-to-bank';
  // Umbra protocol fee (0.30%) applies to anything touching the encrypted
  // balance. stealth-to-bank is a plain SOL transfer between public ATAs,
  // so no protocol fee.
  const hasProtocolFee = direction !== 'stealth-to-bank';
  const maxSol = maxSpendableSol(sourceSol, sourcePaysFees, hasProtocolFee);
  const maxLabel = formatSolBalance(maxSol);

  const fiat = (Number(amount) * rate).toFixed(2);

  const close = () => router.back();
  const onKey = (k: string) => setAmount((a) => applyAmountKey(a, k));

  // Block bank → shielded the moment the user lands here without a stealth
  // wallet. No amount entry, no swipe, no chance to type into a flow that's
  // guaranteed to fail.
  const stealthMissingForBankToShielded =
    direction === 'bank-to-shielded' && !!user && !user.stealfWallet;

  const numericAmount = Number(amount);
  const insufficient = numericAmount > sourceSol;
  const swipeDisabled = numericAmount <= 0 || insufficient;

  // Scale the amount type down as digits accumulate so very long values stay
  // on one line. The decimal point doesn't count as a digit.
  const digitCount = amount.replace('.', '').length;
  const amountFontSize =
    digitCount >= 12 ? 36 : digitCount >= 10 ? 48 : digitCount >= 8 ? 60 : 72;

  const invalidateAll = async () => {
    const keys: Promise<unknown>[] = [
      queryClient.invalidateQueries({
        queryKey: shieldedBalanceQueries.byStealfWallet(user?.stealfWallet ?? ''),
      }),
    ];
    if (user?.bankWallet) {
      keys.push(
        queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.bankWallet) }),
        queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.bankWallet) }),
        queryClient.invalidateQueries({
          queryKey: pendingClaimsForCashQueries.byBankWallet(user.bankWallet),
        }),
      );
    }
    if (user?.stealfWallet) {
      keys.push(
        queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.stealfWallet) }),
        queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.stealfWallet) }),
        queryClient.invalidateQueries({
          queryKey: pendingClaimsQueries.byStealfWallet(user.stealfWallet),
        }),
      );
    }
    await Promise.all(keys);
  };

  const onSubmit = () => {
    const num = Number(amount);
    if (!num || num <= 0) return;

    // Pre-flight: surface auth/wallet/balance gaps as failed pills + close
    // the modal. The user gets the explanation on the destination screen
    // instead of an intrusive Alert that traps them in the modal.
    const failPre = (msg: string) => {
      const id = pendingOps.enqueue({
        kind: kindForDirection(direction),
        tone,
        amountSol: num,
      });
      pendingOps.complete(id, 'failed', msg);
      close();
    };

    if (!user) return failPre('Please sign in again before continuing.');
    if (direction === 'bank-to-shielded' && !user.stealfWallet) {
      return failPre(
        'Set up your stealth wallet first. Open the Stealth tab to create or import one.',
      );
    }
    if (direction === 'shielded-to-bank' && !user.bankWallet) {
      return failPre('Bank wallet missing. Sign out and back in to restore it.');
    }
    if (direction === 'stealth-to-bank' && (!user.bankWallet || !user.stealfWallet)) {
      return failPre(
        !user.stealfWallet
          ? 'Set up your stealth wallet first.'
          : 'Bank wallet missing. Sign out and back in to restore it.',
      );
    }
    if (num > sourceSol) {
      return failPre(
        `Not enough ${assetSymbol}. You have ${formatSolBalance(sourceSol)} ${assetSymbol} available.`,
      );
    }

    const lamportsBig = BigInt(Math.floor(num * 10 ** SOL_DECIMALS));
    const mint = toAddress(SOL_MINT);
    const stealfWallet = user.stealfWallet ?? null;
    const bankWallet = user.bankWallet ?? null;

    const opId = pendingOps.enqueue({
      kind: kindForDirection(direction),
      tone,
      amountSol: num,
    });

    // Eager close — pill takes over the status surface from here. Balances
    // stay honest until the op confirms (no optimistic debit).
    close();

    void (async () => {
      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        if (direction === 'bank-to-shielded') {
          // Stealth (the destination) needs its EncryptedUserAccount PDA
          // before the receiver-claimable encryption can target it. This is
          // idempotent on subsequent moves.
          try {
            await ensureRegistered();
          } catch (regErr: any) {
            const reason = regErr?.userMessage || regErr?.message || '';
            throw Object.assign(new Error('Privacy registration failed'), {
              userMessage: `Couldn't register your stealth wallet with the privacy protocol${
                reason ? `: ${reason}` : '.'
              } Try again in a moment.`,
            });
          }
          const bankClient = await getBankClient();
          const create = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({
            client: bankClient,
          });
          await wrap(
            'getPublicBalanceToReceiverClaimableUtxoCreatorFunction',
            () =>
              create({
                destinationAddress: toAddress(stealfWallet!),
                mint,
                amount: lamportsBig,
              }),
          );
        } else if (direction === 'shielded-to-bank') {

          const stealthClient = await getStealthClient();
          const create = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction({
            client: stealthClient,
          });
          await wrap(
            'getEncryptedBalanceToSelfClaimableUtxoCreatorFunction',
            () =>
              create({
                destinationAddress: toAddress(bankWallet!),
                mint,
                amount: lamportsBig,
              }),
          );
        } else {

          const stealthClient = await getStealthClient();
          const create = getPublicBalanceToSelfClaimableUtxoCreatorFunction({
            client: stealthClient,
          });
          await wrap(
            'getPublicBalanceToSelfClaimableUtxoCreatorFunction',
            () =>
              create({
                destinationAddress: toAddress(bankWallet!),
                mint,
                amount: lamportsBig,
              }),
          );
        }

        clearTimeout(provingTimer);
        pendingOps.setPhase(opId, 'confirming');

        if (__DEV__) console.log('[MoveFlow] success →', direction);
        await invalidateAll();
        pendingOps.complete(opId, 'done');

        const bankAddr = user?.bankWallet;
        const stealfAddr = user?.stealfWallet;
        const targetQueryKey =
          direction === 'bank-to-shielded'
            ? stealfAddr
              ? pendingClaimsQueries.byStealfWallet(stealfAddr)
              : null
            : bankAddr
              ? pendingClaimsForCashQueries.byBankWallet(bankAddr)
              : null;
        if (targetQueryKey) {
          [3000, 8000, 15000].forEach((d) =>
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: targetQueryKey });
            }, d),
          );
        }
      } catch (err: any) {
        clearTimeout(provingTimer);
        const msg = err?.userMessage || err?.message || 'Move failed';
        if (__DEV__) console.warn('[MoveFlow] failed:', direction, msg);
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  const ctaLabel = config.cta;

  if (stealthMissingForBankToShielded) {
    return (
      <CenterGlow tone={tone}>
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 20,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View style={{ width: 36 }} />
          <Text
            style={[
              serif,
              {
                flex: 1,
                textAlign: 'center',
                fontSize: 17,
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
          >
            {config.title}
          </Text>
          <CloseBtn onPress={close} />
        </View>

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 14,
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 9,
                letterSpacing: 2.52,
                textTransform: 'uppercase',
                color: palette.accent,
                fontWeight: '700',
              },
            ]}
          >
            Stealth wallet required
          </Text>
          <Text
            style={[
              sansationLight,
              {
                fontSize: 26,
                color: T.ink,
                textAlign: 'center',
                letterSpacing: -0.78,
                lineHeight: 32,
              },
            ]}
          >
            Set up your stealth wallet first
          </Text>
          <Text
            style={[
              serif,
              {
                fontSize: 14,
                fontStyle: 'italic',
                color: palette.inkDim,
                textAlign: 'center',
                lineHeight: 21,
                paddingHorizontal: 12,
              },
            ]}
          >
            You need a stealth wallet to receive funds privately. Open the
            Stealth tab to create or import one, then come back here.
          </Text>
          <Pressable
            onPress={() => {
              close();
              router.replace('/(tabs)/stealth');
            }}
            accessibilityRole="button"
            accessibilityLabel="Open stealth setup"
            style={{
              marginTop: 12,
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  letterSpacing: 2.4,
                  textTransform: 'uppercase',
                  fontWeight: '700',
                  color: T.ink,
                },
              ]}
            >
              Set up stealth wallet
            </Text>
            <Icons.arrRight size={12} color={T.ink} />
          </Pressable>
        </View>
      </CenterGlow>
    );
  }

  return (
    <CenterGlow tone={tone}>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View style={{ width: 36 }} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          {config.title}
        </Text>
        <CloseBtn onPress={close} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <DirectionRow
          fromLabel={config.fromLabel}
          toLabel={config.toLabel}
          tone={tone}
        />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            paddingHorizontal: 28,
            gap: 6,
          }}
        >
          <Text
            style={[
              sansationLight,
              {
                fontSize: amountFontSize,
                letterSpacing: amountFontSize * -0.05,
                color: palette.ink,
                lineHeight: amountFontSize,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {amount}
          </Text>
          <Text
            style={[
              serif,
              {
                fontSize: 28,
                color: palette.accent,
                fontStyle: 'italic',
                lineHeight: 28,
                includeFontPadding: false,
              },
            ]}
          >
            {assetSymbol}
          </Text>
        </View>
        <Text
          style={[
            serif,
            {
              textAlign: 'center',
              marginTop: 12,
              fontStyle: 'italic',
              fontSize: 22,
              color: palette.inkDim,
            },
          ]}
        >
          ≈ ${fiat}
        </Text>
        {hasProtocolFee && numericAmount > 0 ? (
          <Text
            style={[
              sansation,
              {
                textAlign: 'center',
                marginTop: 6,
                fontSize: 10.5,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: palette.inkFaint,
              },
            ]}
          >
            Privacy fee {(PROTOCOL_FEE_RATE * 100).toFixed(2)}% ·{' '}
            {protocolFeeSol(numericAmount).toFixed(4).replace(/\.?0+$/, '')}{' '}
            {assetSymbol}
          </Text>
        ) : null}
        {insufficient ? (
          <Text
            style={[
              sansation,
              {
                textAlign: 'center',
                marginTop: 10,
                fontSize: 11,
                letterSpacing: 0.4,
                color: T.red,
              },
            ]}
          >
            Not enough {assetSymbol} — you have {balanceLabel} {assetSymbol}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Pressable
          onPress={() => setAmount(maxLabel)}
          accessibilityRole="button"
          accessibilityLabel={`Use max balance ${maxLabel} ${assetSymbol}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={
              tone === 'gold' ? ['#e6c079', '#a37b2e'] : ['#e8e8ea', '#9a9a9f']
            }
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: '#0a0a0a',
              },
            ]}
          >
            Max
          </Text>
          <View style={{ width: 1, height: 10, backgroundColor: 'rgba(0,0,0,0.2)' }} />
          <Text
            style={[
              sansation,
              { fontSize: 10, color: '#0a0a0a', fontWeight: '500' },
            ]}
          >
            {maxLabel} {assetSymbol}
          </Text>
        </Pressable>
      </View>

      <Numpad onKey={onKey} tone={tone} />

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <SwipeToSend
          tone={tone}
          label={ctaLabel}
          onSend={onSubmit}
          disabled={swipeDisabled}
        />
      </View>

      <StealthSetupOverlay onClose={close} />
    </CenterGlow>
  );
}

