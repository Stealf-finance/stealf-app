import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { LoaderRefreshButton } from '@/src/design-system/primitives/LoaderRefreshButton';
import { LoaderDots } from '@/src/design-system/primitives/LoaderDots';
import { Icons } from '@/src/design-system/icons';
import { mono, sansation, serif } from '@/src/design-system/typography';
import { Palette, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { usePendingClaimsForCash } from '@/src/features/stealth/hooks/usePendingClaimsForCash';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';
import { claimScanQueries } from '@/src/features/stealth/hooks/useClaimScan';
import type { ClaimScanResult } from '@/src/services/umbra/queries/claims';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { shieldedBalanceQueries } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { encryptedBalancesQueries } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';
import { reconstructAddressFromU128Parts } from '@umbra-privacy/sdk/solana';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import {
  SOL_MINT,
  USDC_MINT,
  DUSDC_MINT,
  DUSDT_MINT,
} from '@/src/constants/solana';
import {
  describeClaimLine,
  CLAIM_FALLBACK_LABEL,
  type ClaimToken,
} from './lib/describeClaimLine';

const GOLD_GRADIENT: [string, string] = ['#e6c079', '#a37b2e'];
// Kept for the Claim button's glow — everything else on this screen is neutral.
const GOLD_GLOW = 'rgba(230,192,121,0.45)';
const ANIM_HOLD_MS = 480;

type Item = { ago: string; utxo: unknown };

function utxoToItem(utxo: any): Item {
  return { ago: 'Encrypted', utxo };
}

function tokenForMint(mint: string | null, solUsd: number | null): ClaimToken | null {
  switch (mint) {
    case DUSDC_MINT:
      return { symbol: 'dUSDC', decimals: 6, usdPerUnit: 1 };
    case DUSDT_MINT:
      return { symbol: 'dUSDT', decimals: 6, usdPerUnit: 1 };
    case USDC_MINT:
      return { symbol: 'USDC', decimals: 6, usdPerUnit: 1 };
    case SOL_MINT:
      return { symbol: 'SOL', decimals: 9, usdPerUnit: solUsd };
    default:
      return null;
  }
}

function addrFromParts(low: unknown, high: unknown): string | null {
  if (low == null || high == null) return null;
  try {
    return reconstructAddressFromU128Parts({
      low: low as never,
      high: high as never,
    }) as unknown as string;
  } catch {
    return null;
  }
}

/** Reads sender / mint / amount off an Umbra note (the burn-ready note encodes
 *  the addresses as U128 low/high halves) and builds the display line. Degrades
 *  gracefully to "Encrypted to bank" when fields aren't present. */
function claimLineForNote(note: any, solUsd: number | null): string {
  const mint =
    addrFromParts(note?.mintAddressLow, note?.mintAddressHigh) ??
    (typeof note?.mint === 'string' ? note.mint : null);
  const sender =
    addrFromParts(note?.senderAddressLow, note?.senderAddressHigh) ??
    (typeof note?.sender === 'string' ? note.sender : null);
  return describeClaimLine({
    sender,
    token: tokenForMint(mint, solUsd),
    amountRaw: note?.amount ?? null,
  });
}

export function ClaimsScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();

  // `target` picks the claim destination:
  //   bank      → claim self-burnable UTXOs out to the public bank wallet
  //   encrypted → claim incoming transfers into the encrypted balance
  const params = useLocalSearchParams<{ target?: string }>();
  const isEncrypted = params.target === 'encrypted';
  const palette = txPalette(isEncrypted ? 'gold' : 'silver');

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  const { claimSelfToPublic, claimReceived } = useUmbra();
  // Force a fresh scan on screen mount for the active target — this screen
  // owns the truth of claimable UTXOs. The home pending-dots read the cache.
  // Both hooks share the same underlying scan query, so the idle one just
  // selects a different slice of the cached result.
  const cash = usePendingClaimsForCash({ fetch: !isEncrypted });
  const inbound = usePendingClaims({ fetch: isEncrypted });
  const {
    data: pendingUtxos,
    refetch,
    isFetching,
  } = isEncrypted ? inbound : cash;
  const { data: solPrice } = useSolPrice();
  const solUsd = solPrice ?? null;

  const items: Item[] = (pendingUtxos ?? []).map(utxoToItem);
  const [claimingIndex, setClaimingIndex] = useState<number | null>(null);

  const close = () => router.back();

  const onClaim = (item: Item, index: number) => {
    if (!item.utxo || claimingIndex !== null) return;
    setClaimingIndex(index);

    const bankWallet = user?.bankWallet ?? null;
    const stealfWallet = user?.stealfWallet ?? null;
    const claimKey = stealfWallet
      ? claimScanQueries.byStealfWallet(stealfWallet)
      : null;

    const snapshot = claimKey
      ? queryClient.getQueryData<ClaimScanResult>(claimKey)
      : undefined;

    const removeFromCache = () => {
      if (!claimKey) return;
      queryClient.setQueryData<ClaimScanResult>(claimKey, (prev) => {
        if (!prev) return prev;
        // Drop the just-claimed UTXO from whichever slice this target reads.
        return isEncrypted
          ? {
              ...prev,
              received: prev.received.filter((u) => u !== item.utxo),
              publicReceived: prev.publicReceived.filter(
                (u) => u !== item.utxo,
              ),
            }
          : {
              ...prev,
              selfBurnable: prev.selfBurnable.filter((u) => u !== item.utxo),
              publicSelfBurnable: prev.publicSelfBurnable.filter(
                (u) => u !== item.utxo,
              ),
            };
      });
    };

    const opId = pendingOps.enqueue({
      kind: isEncrypted ? 'claim-to-shielded' : 'claim-to-bank',
      tone: 'gold',
      amountSol: 0,
    });

    setTimeout(() => {
      removeFromCache();
      if (router.canGoBack()) {
        router.replace(isEncrypted ? '/(tabs)/stealth' : '/(tabs)/bank');
      }
    }, ANIM_HOLD_MS);

    void (async () => {
      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        await (isEncrypted
          ? claimReceived([item.utxo])
          : claimSelfToPublic([item.utxo]));
        clearTimeout(provingTimer);
        pendingOps.setPhase(opId, 'confirming');

        const invalidate = () => {
          if (stealfWallet) {
            queryClient.invalidateQueries({
              queryKey: claimScanQueries.byStealfWallet(stealfWallet),
            });
          }
          if (isEncrypted) {
            if (!stealfWallet) return;
            queryClient.invalidateQueries({
              queryKey: shieldedBalanceQueries.byStealfWallet(stealfWallet),
            });
            queryClient.invalidateQueries({
              queryKey:
                encryptedBalancesQueries.byStealfWalletPrefix(stealfWallet),
            });
          } else {
            if (!bankWallet) return;
            queryClient.invalidateQueries({
              queryKey: balanceQueries.byAddress(bankWallet),
            });
            queryClient.invalidateQueries({
              queryKey: historyQueries.byAddress(bankWallet),
            });
          }
        };
        invalidate();
        [3000, 8000, 15000].forEach((d) => setTimeout(invalidate, d));

        pendingOps.complete(opId, 'done');
      } catch (err: any) {
        clearTimeout(provingTimer);
        // Roll the optimistic removal back so the note reappears — the on-chain
        // UTXO is still unspent.
        if (claimKey && snapshot) {
          queryClient.setQueryData(claimKey, snapshot);
        }
        const msg = err?.userMessage || err?.message || 'Claim failed';
        if (__DEV__) console.warn('[ClaimsScreen] claim failed:', msg);
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  return (
    <BlurView
      intensity={40}
      tint="dark"
      experimentalBlurMethod="dimezisBlurView"
      style={{ flex: 1, backgroundColor: 'rgba(8,8,10,0.5)' }}
    >
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 12,
          paddingHorizontal: 20,
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
          Vault
        </Text>
        {/* Spacer to keep the title centered now that the close button is gone. */}
        <View style={{ width: 36 }} />
      </View>

      <View
        style={{
          paddingTop: 8,
          paddingBottom: 22,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 9,
              letterSpacing: 2.52,
              textTransform: 'uppercase',
              color: T.inkDim,
              fontWeight: '700',
            },
          ]}
        >
          Incoming Assets
        </Text>
        <LoaderRefreshButton
          onPress={() => refetch()}
          spinning={isFetching}
          size={36}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isFetching && items.length === 0 ? (
          <ScanningState palette={palette} />
        ) : items.length === 0 ? (
          <EmptyState
            palette={palette}
            destination={isEncrypted ? 'your encrypted balance' : 'your bank'}
          />
        ) : (
          items.map((tx, i) => {
            if (__DEV__ && i === 0) {
              console.log('[claims] sample note keys', Object.keys(tx.utxo ?? {}));
            }
            return (
              <ClaimItem
                key={`claim-${i}`}
                label={claimLineForNote(tx.utxo, solUsd)}
                claiming={claimingIndex === i}
                disabled={claimingIndex !== null && claimingIndex !== i}
                onClaim={() => onClaim(tx, i)}
              />
            );
          })
        )}
      </ScrollView>
    </BlurView>
  );
}

function ClaimItem({
  label,
  claiming,
  disabled,
  onClaim,
}: {
  label: string;
  claiming: boolean;
  disabled: boolean;
  onClaim: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <IconChip />

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={[
                label === CLAIM_FALLBACK_LABEL ? sansation : serif,
                {
                  fontStyle:
                    label === CLAIM_FALLBACK_LABEL ? 'normal' : 'italic',
                  fontSize: 14,
                  color: T.ink,
                  fontWeight: '500',
                  includeFontPadding: false,
                },
              ]}
            >
              {label}
            </Text>
            {label !== CLAIM_FALLBACK_LABEL ? (
              <Text
                style={[
                  mono,
                  {
                    fontSize: 10,
                    color: T.inkFaint,
                    marginTop: 3,
                    letterSpacing: 0.4,
                  },
                ]}
              >
                Private transfer
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <ClaimButton
            accentGlow={GOLD_GLOW}
            claiming={claiming}
            disabled={disabled}
            onPress={onClaim}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function ScanningState({ palette }: { palette: Palette }) {
  return (
    <View style={{ paddingTop: 72, alignItems: 'center', gap: 20 }}>
      <LoaderDots color={palette.accent} size={9} bounce={9} />
      <Text
        style={[
          serif,
          {
            fontSize: 14,
            fontStyle: 'italic',
            color: palette.inkFaint,
            textAlign: 'center',
          },
        ]}
      >
        Scanning encrypted notes…
      </Text>
    </View>
  );
}

function EmptyState({
  palette,
  destination,
}: {
  palette: Palette;
  destination: string;
}) {
  return (
    <View style={{ paddingTop: 60, alignItems: 'center' }}>
      <Text
        style={[
          serif,
          {
            fontSize: 15,
            fontStyle: 'italic',
            color: palette.inkFaint,
            textAlign: 'center',
          },
        ]}
      >
        No transfers on the way to {destination}.
      </Text>
    </View>
  );
}

function IconChip() {
  // Received-transaction arrow, matching the history rows (borderless, size 26).
  return (
    <View
      style={{
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icons.arrDownLeft size={26} color="#ffffff" />
    </View>
  );
}

function ClaimButton({
  accentGlow,
  claiming,
  disabled,
  onPress,
}: {
  accentGlow: string;
  claiming: boolean;
  disabled: boolean;
  onPress?: () => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(claiming ? 1 : 0, { duration: 280 });
  }, [claiming, progress]);

  const idleStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.92]) }],
  }));

  const claimedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.85, 1]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Claim to bank"
      onPress={onPress}
      disabled={claiming || disabled}
      style={{
        alignSelf: 'flex-end',
        borderRadius: 100,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        shadowColor: accentGlow,
        shadowOpacity: 1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <LinearGradient
        colors={GOLD_GRADIENT}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 24,
          minWidth: 116,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 36,
        }}
      >
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            },
            idleStyle,
          ]}
        >
          <Icons.check size={12} color="#0a0a0a" strokeWidth={2.4} />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: '#0a0a0a',
              },
            ]}
          >
            Claim
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            {
              position: 'absolute',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            },
            claimedStyle,
          ]}
        >
          <Icons.check size={14} color="#0a0a0a" strokeWidth={2.8} />
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: '#0a0a0a',
              },
            ]}
          >
            Claimed
          </Text>
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}
