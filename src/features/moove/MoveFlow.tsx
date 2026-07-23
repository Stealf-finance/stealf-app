import { useEffect, useRef, useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  maxSpendableSol,
  protocolFeeSol,
  SOL_DECIMALS,
  PRIVATE_OP_SOL_FEE_RESERVE,
} from '@/src/features/send/lib/amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { ChoiceSheet } from '@/src/features/wallet-detail/ChoiceSheet';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { TiledKeypadPanel } from '@/src/features/send/components/TiledKeypadPanel';
import {
  ACCOUNT_IMAGE,
  MoveAccountCards,
} from '@/src/features/moove/components/MoveAccountCards';
import { MoveConfirm } from '@/src/features/moove/components/MoveConfirm';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import {
  setSelectedAsset,
  useSelectedAsset,
} from '@/src/features/send/lib/selectedAssetStore';
import { Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { toAddress } from '@/src/services/solana/kit';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import {
  useShieldedSolBalance,
  shieldedBalanceQueries,
} from '@/src/features/stealth/hooks/useShieldedSolBalance';
import {
  useEncryptedBalances,
  encryptedBalancesQueries,
} from '@/src/features/stealth/hooks/useEncryptedBalances';
import {
  useUmbra,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
} from '@/src/features/stealth/hooks/useUmbra';
import { claimScanQueries } from '@/src/features/stealth/hooks/useClaimScan';
import { INSUFFICIENT_FEE_SOL_MESSAGE } from '@/src/features/stealth/lib/errors';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';
import type { PendingOpKind } from '@/src/components/pending-ops/types';
import { amountBand, scrubString } from '@/src/services/observability/scrub';
import * as Sentry from '@sentry/react-native';

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
    title: 'Cash account to encrypted balance',
    fromLabel: 'Cash account',
    toLabel: 'Encrypted balance',
    cta: 'Slide to move',
  },
  'shielded-to-bank': {
    title: 'Encrypted balance to Cash account',
    fromLabel: 'Encrypted balance',
    toLabel: 'Cash account',
    cta: 'Slide to move',
  },
  'stealth-to-bank': {
    title: 'Wallet to Cash account',
    fromLabel: 'Wallet',
    toLabel: 'Cash account',
    cta: 'Slide to move',
  },
};

const DIRECTIONS: MoveDirection[] = [
  'bank-to-shielded',
  'shielded-to-bank',
  'stealth-to-bank',
];

// Flat Solana network fee (same value the send flow uses).
const NETWORK_FEE_SOL = 0.000005;

type Account = 'bank' | 'stealth' | 'encrypted';

const DIR_ACCOUNTS: Record<MoveDirection, { from: Account; to: Account }> = {
  'bank-to-shielded': { from: 'bank', to: 'encrypted' },
  'shielded-to-bank': { from: 'encrypted', to: 'bank' },
  'stealth-to-bank': { from: 'stealth', to: 'bank' },
};

function formatBalance(amount: number): string {
  if (amount === 0) return '0';
  return amount.toFixed(4).replace(/\.?0+$/, '');
}

export function MoveFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ direction?: string }>();
  const initialIndex = Math.max(
    0,
    DIRECTIONS.indexOf((params.direction as MoveDirection) ?? 'bank-to-shielded'),
  );

  const [directionIndex, setDirectionIndex] = useState(initialIndex);
  const direction = DIRECTIONS[directionIndex];
  // Source-account picker sheet — the source uniquely determines the
  // direction (each account is the `from` of exactly one direction).
  const [pickerOpen, setPickerOpen] = useState(false);

  const tone: Tone = direction === 'shielded-to-bank' ? 'gold' : 'silver';

  const supportsMultiToken = true;

  const pickerWalletParam: 'bank' | 'stealth' | 'encrypted' =
    direction === 'bank-to-shielded'
      ? 'bank'
      : direction === 'shielded-to-bank'
        ? 'encrypted'
        : 'stealth';

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  const { data: solPrice } = useSolPrice();
  const posthog = usePostHog();
  const posthogRef = useRef(posthog);
  posthogRef.current = posthog;

  const {
    wrap,
    getStealthClient,
    getBankClient,
    ensureRegistered,
  } = useUmbra();


  const { data: bankBalanceData } = useBalance(user?.bankWallet ?? null);

  const { data: stealthBalanceData } = useBalance(user?.stealfWallet ?? null);
  const { data: shielded } = useShieldedSolBalance();
  const { data: encrypted } = useEncryptedBalances();

  const selected = useSelectedAsset();
  const isSolSelected =
    !selected || selected.mint === SOL_MINT || selected.symbol === 'SOL';
  const selectionActive = !isSolSelected && !!selected;

  const assetSymbol = selected?.symbol ?? 'SOL';
  const decimals = selectionActive ? selected!.decimals : SOL_DECIMALS;
  const iconUri = selectionActive ? selected!.iconUri : SOL_ICON_URI;

  // Balance of any account in the currently-selected asset.
  const balForAccount = (acct: Account): number => {
    if (acct === 'encrypted') {
      return selectionActive
        ? encrypted?.tokens.find((t) => t.mint === selected!.mint)?.amount ?? 0
        : shielded?.sol ?? 0;
    }
    const tokens =
      (acct === 'bank' ? bankBalanceData : stealthBalanceData)?.tokens ?? [];
    return selectionActive
      ? tokens.find((t) => t.tokenMint === selected!.mint)?.balance ?? 0
      : tokens.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  };

  const sourceBalance = balForAccount(DIR_ACCOUNTS[direction].from);

  const rate = selectionActive
    ? selected!.price
    : typeof solPrice === 'number' && solPrice > 0
      ? solPrice
      : 0;

  const sourcePaysFees =
    direction === 'bank-to-shielded' || direction === 'stealth-to-bank';

  const hasProtocolFee = true;
  const reserveFees = sourcePaysFees && !selectionActive;
  // Encrypted moves queue an Arcium computation, so "Max" must keep back the
  // larger Arcium-aware SOL reserve on top of the 0.30% protocol fee.
  const maxSol = maxSpendableSol(
    sourceBalance,
    reserveFees,
    hasProtocolFee,
    PRIVATE_OP_SOL_FEE_RESERVE,
  );

  const {
    setAmount,
    inputMode,
    solAmount,
    fiatAmount,
    primaryDisplay,
    onKey,
    onPressPercent,
    onToggleMode,
  } = useAmountInput({ rate, maxSol, decimals });

  useEffect(() => {
    setAmount('0');
  }, [selected?.mint, direction, setAmount]);

  useEffect(() => {
    return () => {
      setSelectedAsset(null);
    };
  }, []);

  const secondaryBase =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(4)} ${assetSymbol}`;
  const secondaryAmount = `~${secondaryBase}`;

  const fromBalanceLabel = `${formatBalance(sourceBalance)} ${assetSymbol}`;

  // Hero amount split — mirrors AmountCardTiles (Shield/Send): detached $,
  // digit-count-adaptive body size.
  const heroHasDollar = primaryDisplay.startsWith('$');
  const heroBody = heroHasDollar ? primaryDisplay.slice(1) : primaryDisplay;
  const heroDigits = heroBody.replace(/[^0-9]/g, '').length;
  const heroSize = heroDigits >= 10 ? 48 : heroDigits >= 8 ? 60 : 72;

  // Confirmation step (slide-to-confirm) after the amount entry.
  const [step, setStep] = useState<'amount' | 'confirm'>('amount');
  // Tx signature of the move, surfaced in the pending sheet (Solscan link).
  const [moveSig, setMoveSig] = useState<string | undefined>(undefined);
  const config = CONFIG[direction];

  const networkFeeUsd =
    typeof solPrice === 'number' && solPrice > 0
      ? NETWORK_FEE_SOL * solPrice
      : 0;
  const privacyFeeUsd = protocolFeeSol(solAmount) * rate;

  // Resolve the on-chain address backing an account (encrypted balance + stealth
  // both live on the stealf wallet); shortened for the confirmation rows.
  const addressForAccount = (a: Account): string | undefined =>
    a === 'bank' ? user?.bankWallet ?? undefined : user?.stealfWallet ?? undefined;
  const shortAddr = (s?: string): string | undefined =>
    s ? `${s.slice(0, 4)}…${s.slice(-4)}` : undefined;
  const dirAccounts = DIR_ACCOUNTS[direction];

  const close = () => router.back();
  const handleBack = () => {
    if (step === 'confirm') setStep('amount');
    else close();
  };

  const insufficient = solAmount > sourceBalance;
  const swipeDisabled = solAmount <= 0 || insufficient;

  const invalidateAll = async () => {
    const keys: Promise<unknown>[] = [
      queryClient.invalidateQueries({
        queryKey: shieldedBalanceQueries.byStealfWallet(user?.stealfWallet ?? ''),
      }),
      queryClient.invalidateQueries({
        queryKey: encryptedBalancesQueries.byStealfWalletPrefix(
          user?.stealfWallet ?? '',
        ),
      }),
    ];
    if (user?.bankWallet) {
      keys.push(
        queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.bankWallet) }),
        queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.bankWallet) }),
      );
    }
    if (user?.stealfWallet) {
      keys.push(
        queryClient.invalidateQueries({ queryKey: balanceQueries.byAddress(user.stealfWallet) }),
        queryClient.invalidateQueries({ queryKey: historyQueries.byAddress(user.stealfWallet) }),
        queryClient.invalidateQueries({
          queryKey: claimScanQueries.byStealfWallet(user.stealfWallet),
        }),
      );
    }
    await Promise.all(keys);
  };

  const onSubmit = () => {
    const num = solAmount;
    if (!num || num <= 0) return;

    const failPre = (msg: string) => {
      const id = pendingOps.enqueue({
        kind: kindForDirection(direction),
        tone,
        amountSol: num,
        assetSymbol,
      });
      pendingOps.complete(id, 'failed', msg);
      close();
    };

    if (!user) return failPre('Please sign in again before continuing.');
    if (direction === 'bank-to-shielded' && !user.stealfWallet) {
      return failPre(
        'Set up your wallet first. Open the Payment tab to create or import one.',
      );
    }
    if (direction === 'shielded-to-bank' && !user.bankWallet) {
      return failPre('Virtual bank account missing. Sign out and back in to restore it.');
    }
    if (direction === 'stealth-to-bank' && (!user.bankWallet || !user.stealfWallet)) {
      return failPre(
        !user.stealfWallet
          ? 'Set up your wallet first.'
          : 'Virtual bank account missing. Sign out and back in to restore it.',
      );
    }
    if (num > sourceBalance) {
      return failPre(
        `Not enough ${assetSymbol}. You have ${formatBalance(sourceBalance)} ${assetSymbol} available.`,
      );
    }

    const stealthSigns =
      direction === 'shielded-to-bank' || direction === 'stealth-to-bank';
    if (stealthSigns) {
      const stealthPublicSol =
        stealthBalanceData?.tokens?.find((t) => t.tokenSymbol === 'SOL')
          ?.balance ?? 0;
      if (stealthPublicSol < PRIVATE_OP_SOL_FEE_RESERVE) {
        return failPre(INSUFFICIENT_FEE_SOL_MESSAGE);
      }
    }

    const mintAddr = selectionActive ? selected!.mint : SOL_MINT;
    const lamportsBig = BigInt(Math.floor(num * 10 ** decimals));
    const mint = toAddress(mintAddr);
    const stealfWallet = user.stealfWallet ?? null;
    const bankWallet = user.bankWallet ?? null;

    setMoveSig(undefined);
    const opId = pendingOps.enqueue({
      kind: kindForDirection(direction),
      tone,
      amountSol: num,
      assetSymbol,
    });

    // Note: the sheet stays open (showing the pending state) — the user
    // dismisses it via the close button; we don't close here.
    void (async () => {
      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        let res: any = null;
        if (direction === 'bank-to-shielded') {
          try {
            await ensureRegistered();
          } catch (regErr: any) {
            const reason = regErr?.userMessage || regErr?.message || '';
            throw Object.assign(new Error('Privacy registration failed'), {
              userMessage: `Couldn't register your wallet with Umbra Privacy${
                reason ? `: ${reason}` : '.'
              } Try again in a moment.`,
            });
          }
          const bankClient = await getBankClient();
          const create = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({
            client: bankClient,
          });
          res = await wrap(
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
          res = await wrap(
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
          res = await wrap(
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

        // Surface the tx signature for the pending sheet's Solscan link.
        const sig =
          res?.signature ?? res?.transactionSignature ?? res?.txSignature;
        if (typeof sig === 'string') setMoveSig(sig);

        if (__DEV__) console.log('[MoveFlow] success →', direction, sig);
        await invalidateAll();
        posthogRef.current?.capture('move_completed', {
          direction,
          asset_symbol: assetSymbol,
          amount_band: amountBand(
            typeof solPrice === 'number' && solPrice > 0 ? num * solPrice : 0,
          ),
        });
        pendingOps.complete(opId, 'done');

        const stealfAddr = user?.stealfWallet;
        if (stealfAddr) {
          const targetQueryKey = claimScanQueries.byStealfWallet(stealfAddr);
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
        // wrap() already captures StealthError — skip to avoid dup.
        if (err?.name !== 'StealthError') {
          Sentry.captureException(err, {
            tags: { 'op.kind': `move-${direction}`, 'wallet.source': 'mixed' },
            extra: {
              userMessage: msg,
              amountBand: amountBand(num),
              asset: assetSymbol,
            },
          });
        }
        posthogRef.current?.capture('move_failed', {
          direction,
          asset_symbol: assetSymbol,
          error: scrubString(msg),
        });
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  return (
    <CenterGlow tone={tone} flat>
      {/* Header: bare chevron + centered 22pt title (SendFlow archetype,
          shared pageSheet routes — see docs/screen-patterns.md). */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <GlassBackButton onPress={handleBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 22,
                lineHeight: 28,
                fontWeight: '600',
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
          >
            Move
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {/* Flat block structure — direct children of CenterGlow, exactly like
          ShieldFlow (an intermediate flex:1 wrapper made the content paint
          over the keypad). */}
      {/* Hero amount — same anatomy, sizes AND vertical position as the
          Shield amount card: fixed 38pt below the header (20 + the card's
          internal 18). */}
      <View style={{ marginTop: 38, alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ alignSelf: 'stretch' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'center',
              }}
            >
            {heroHasDollar ? (
              <Text
                style={[
                  serif,
                  {
                    fontStyle: 'italic',
                    fontSize: 38,
                    lineHeight: 38,
                    color: T.inkDim,
                    includeFontPadding: false,
                  },
                ]}
              >
                $
              </Text>
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                sansation,
                {
                  fontSize: heroSize,
                  lineHeight: heroSize,
                  color: T.ink,
                  letterSpacing: heroSize * -0.04,
                  includeFontPadding: false,
                },
              ]}
            >
              {heroBody}
            </Text>
            {!heroHasDollar ? (
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 16,
                    color: T.inkFaint,
                    marginLeft: 6,
                    includeFontPadding: false,
                  },
                ]}
              >
                {assetSymbol}
              </Text>
            ) : null}
            </View>
            {/* Toggle arrows — absolute right, vertically centered against
                the number (same as Shield). */}
            <Pressable
              onPress={onToggleMode}
              disabled={rate <= 0}
              accessibilityRole="button"
              accessibilityLabel="Switch between fiat and token amount"
              hitSlop={8}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                opacity: rate <= 0 ? 0.4 : 1,
              }}
            >
              <Icons.swapV size={26} color={T.inkDim} strokeWidth={2} />
            </Pressable>
          </View>
          <Text
            style={[
              sansation,
              {
                fontSize: 13,
                color: T.inkFaint,
                marginTop: 10,
                includeFontPadding: false,
              },
            ]}
          >
            {secondaryAmount}
          </Text>
      </View>

      <View style={{ flex: 1 }} />

      {/* From → To cards — just above the keypad */}
      <View style={{ paddingHorizontal: 24 }}>
        <MoveAccountCards
            tone={tone}
            fromAccount={dirAccounts.from}
            toAccount={dirAccounts.to}
            fromLabel={config.fromLabel}
            toLabel={config.toLabel}
            toBalance={`$${(balForAccount(dirAccounts.to) * rate).toFixed(2)}`}
            onPressFrom={() => setPickerOpen(true)}
            assetIconSource={{ uri: iconUri }}
            assetBalanceLabel={fromBalanceLabel}
            onPressSelectAsset={
              supportsMultiToken
                ? () => router.push(`/asset-picker?wallet=${pickerWalletParam}`)
                : undefined
            }
            onPressMax={() => onPressPercent(1)}
          />
      </View>

      {/* Tiled keypad + CTA — pinned to the bottom */}
      <View style={{ paddingBottom: insets.bottom }}>
        <TiledKeypadPanel
          onKey={onKey}
          // Always silver — the Continue CTA shouldn't go gold on the
          // encrypted-balance direction (per Thomas).
          tone="silver"
          ctaLabel={insufficient ? 'Insufficient balance' : 'Continue'}
          onPressCta={() => setStep('confirm')}
          ctaDisabled={swipeDisabled}
        />
      </View>

      {/* Source-account picker — hubs DA; picking the source sets the
          direction (each account is the source of exactly one). */}
      <Modal
        visible={pickerOpen}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => setPickerOpen(false)}
      >
        <ChoiceSheet
          accentIcon={<Icons.moove size={30} color={T.ink} strokeWidth={2.5} />}
          title="Move from"
          subtitle="Choose the account to move funds from"
          onClose={() => setPickerOpen(false)}
          options={DIRECTIONS.map((dir, i) => ({
            key: dir,
            icon: (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={ACCOUNT_IMAGE[DIR_ACCOUNTS[dir].from]}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  style={{ width: 24, height: 24 }}
                />
              </View>
            ),
            title: CONFIG[dir].fromLabel,
            subtitle: `$${(balForAccount(DIR_ACCOUNTS[dir].from) * rate).toFixed(2)} available`,
            onPress: () => {
              setDirectionIndex(i);
              setPickerOpen(false);
            },
          }))}
        />
      </Modal>

      <MoveConfirm
        visible={step === 'confirm'}
        onClose={() => setStep('amount')}
        onDone={() => router.replace('/(tabs)/bank')}
        onNewTransfer={() => setStep('amount')}
        tone={tone}
        title={`Move to ${config.toLabel}`}
        slideLabel="Slide to move"
        fiat={fiatAmount}
        amountLabel={`${formatBalance(solAmount)} ${assetSymbol}`}
        fromLabel={config.fromLabel}
        fromAddress={shortAddr(addressForAccount(dirAccounts.from))}
        toLabel={config.toLabel}
        toAddress={shortAddr(addressForAccount(dirAccounts.to))}
        networkFeeUsd={networkFeeUsd}
        privacyFeeUsd={privacyFeeUsd}
        onConfirm={onSubmit}
        signature={moveSig}
      />

      <StealthSetupOverlay onClose={close} />
    </CenterGlow>
  );
}

