import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-react-native';
import { Pressable, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  maxSpendableSol,
  SOL_DECIMALS,
  PRIVATE_OP_SOL_FEE_RESERVE,
} from '@/src/features/send/lib/amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { StealthSetupOverlay } from '@/src/features/stealth/components/StealthSetupOverlay';
import { Numpad } from '@/src/features/send/components/Numpad';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { SourceAssetCard } from '@/src/features/send/components/SourceAssetCard';
import { PercentageChips } from '@/src/features/send/components/PercentageChips';
import { useAmountInput } from '@/src/features/send/hooks/useAmountInput';
import {
  setSelectedAsset,
  useSelectedAsset,
} from '@/src/features/send/lib/selectedAssetStore';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight, serif } from '@/src/design-system/typography';
import { Tone, txPalette } from '@/src/design-system/palettes';
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
    title: 'Bank to Encrypted Balance',
    fromLabel: 'Bank',
    toLabel: 'Encrypted balance',
    cta: 'Slide to move',
  },
  'shielded-to-bank': {
    title: 'Encrypted Balance to Bank',
    fromLabel: 'Encrypted balance',
    toLabel: 'Bank',
    cta: 'Slide to move',
  },
  'stealth-to-bank': {
    title: 'Wallet to Bank',
    fromLabel: 'Wallet',
    toLabel: 'Bank',
    cta: 'Slide to move',
  },
};

function formatBalance(amount: number): string {
  if (amount === 0) return '0';
  return amount.toFixed(4).replace(/\.?0+$/, '');
}

export function MoveFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ direction?: string }>();
  const direction = (params.direction as MoveDirection) ?? 'bank-to-shielded';
  const config = CONFIG[direction];

  const tone: Tone = direction === 'shielded-to-bank' ? 'gold' : 'silver';
  const palette = txPalette(tone);

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

  const { data: bankBalanceData } = useBalance(
    direction === 'bank-to-shielded' ? user?.bankWallet ?? null : null,
  );

  const { data: stealthBalanceData } = useBalance(
    direction === 'stealth-to-bank' || direction === 'shielded-to-bank'
      ? user?.stealfWallet ?? null
      : null,
  );
  const { data: shielded } = useShieldedSolBalance();
  const { data: encrypted } = useEncryptedBalances();

  const selected = useSelectedAsset();
  const isSolSelected =
    !selected || selected.mint === SOL_MINT || selected.symbol === 'SOL';
  const selectionActive = !isSolSelected && !!selected;

  const assetSymbol = selected?.symbol ?? 'SOL';
  const decimals = selectionActive ? selected!.decimals : SOL_DECIMALS;
  const iconUri = selectionActive ? selected!.iconUri : SOL_ICON_URI;

  let sourceBalance = 0;
  if (direction === 'bank-to-shielded') {
    const tokens = bankBalanceData?.tokens ?? [];
    sourceBalance = selectionActive
      ? tokens.find((t) => t.tokenMint === selected!.mint)?.balance ?? 0
      : tokens.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  } else if (direction === 'stealth-to-bank') {
    const tokens = stealthBalanceData?.tokens ?? [];
    sourceBalance = selectionActive
      ? tokens.find((t) => t.tokenMint === selected!.mint)?.balance ?? 0
      : tokens.find((t) => t.tokenSymbol === 'SOL')?.balance ?? 0;
  } else {
    if (selectionActive) {
      sourceBalance =
        encrypted?.tokens.find((t) => t.mint === selected!.mint)?.amount ?? 0;
    } else {
      sourceBalance = shielded?.sol ?? 0;
    }
  }

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
  }, [selected?.mint, setAmount]);

  useEffect(() => {
    return () => {
      setSelectedAsset(null);
    };
  }, []);

  const secondaryBase =
    inputMode === 'asset'
      ? `$${fiatAmount.toFixed(2)}`
      : `${solAmount.toFixed(4)} ${assetSymbol}`;
  const secondaryAmount = hasProtocolFee
    ? `~${secondaryBase} (-0.30%)`
    : `~${secondaryBase}`;

  const maxBalanceLabel =
    inputMode === 'fiat'
      ? `$${(maxSol * rate).toFixed(2)}`
      : `${maxSol.toFixed(4)} ${assetSymbol}`;

  const close = () => router.back();

  const stealthMissingForBankToShielded =
    direction === 'bank-to-shielded' && !!user && !user.stealfWallet;

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

    const opId = pendingOps.enqueue({
      kind: kindForDirection(direction),
      tone,
      amountSol: num,
      assetSymbol,
    });


    close();

    void (async () => {
      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        if (direction === 'bank-to-shielded') {
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
        posthogRef.current?.capture('move_failed', {
          direction,
          asset_symbol: assetSymbol,
          error: scrubString(msg),
        });
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  const ctaLabel = config.cta;

  if (stealthMissingForBankToShielded) {
    return (
      <CenterGlow tone={tone} flat>
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
          <BackBtn onPress={close} />
          <Text
            style={[
              serif,
              {
                flex: 1,
                textAlign: 'center',
                fontSize: 32,
                fontStyle: 'italic',
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
          >
            Move
          </Text>
          <View style={{ width: 36 }} />
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
    <CenterGlow tone={tone} flat>
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
        <BackBtn onPress={close} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 32,
              fontStyle: 'italic',
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          Move
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <SourceAssetCard
          label="Move"
          fromLabel={config.fromLabel}
          toLabel={config.toLabel}
          tone={tone}
          iconSource={{ uri: iconUri }}
          tokenLabel={assetSymbol}
          primaryAmount={primaryDisplay}
          secondaryAmount={secondaryAmount}
          inputMode={inputMode}
          onPressTokenPill={
            supportsMultiToken
              ? () => router.push(`/asset-picker?wallet=${pickerWalletParam}`)
              : undefined
          }
          onToggleMode={onToggleMode}
          toggleDisabled={rate <= 0}
          maxLabel={maxBalanceLabel}
        />
      </View>

      <PercentageChips
        onPressPercent={onPressPercent}
        disabled={maxSol <= 0}
      />

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
          label={insufficient ? 'Insufficient balance' : ctaLabel}
          onSend={onSubmit}
          disabled={swipeDisabled}
        />
      </View>

      <StealthSetupOverlay onClose={close} />
    </CenterGlow>
  );
}

