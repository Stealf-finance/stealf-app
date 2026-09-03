import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
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
import { UmbraSetupOverlay } from '@/src/features/umbra/components/UmbraSetupOverlay';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { LoaderRefreshButton } from '@/src/design-system/primitives/LoaderRefreshButton';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useUmbra } from '@/src/features/umbra/hooks/useUmbra';
import { usePendingClaimsForCash } from '@/src/features/umbra/hooks/usePendingClaimsForCash';
import { usePendingClaims } from '@/src/features/umbra/hooks/usePendingClaims';
import { claimScanQueries } from '@/src/features/umbra/hooks/useClaimScan';
import type { ClaimScanResult } from '@/src/services/umbra/queries/scanNotes';
import * as Sentry from '@sentry/react-native';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import { shieldedBalanceQueries } from '@/src/features/umbra/hooks/useShieldedSolBalance';
import { encryptedBalancesQueries } from '@/src/features/umbra/hooks/useEncryptedBalances';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';
import { reconstructAddressFromU128Parts } from '@umbra-privacy/sdk/solana';
import { useSolPrice } from '@/src/features/solana/hooks/useSolPrice';
import { describeClaimParts } from './lib/describeClaimLine';
import { claimTokenForMint } from './lib/claimToken';

const GOLD_GRADIENT: [string, string] = ['#e8e8ea', '#9a9a9f'];
// Kept for the Claim button's glow — everything else on this screen is neutral.
const GOLD_GLOW = 'rgba(220,220,225,0.35)';
const ANIM_HOLD_MS = 480;

type Item = { ago: string; utxo: unknown };

function utxoToItem(utxo: any): Item {
  return { ago: 'Encrypted', utxo };
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
function claimPartsForNote(
  note: any,
  solUsd: number | null,
): {
  sender: string | null;
  symbol: string | null;
  iconUri: string | null;
  tokenAmount: string | null;
  usdValue: string | null;
} {
  // The sender / mint live inside `h1Components` (u128 low/high halves); only
  // `amount` sits at the top level of the burnable note.
  const h1 = note?.h1Components ?? note;
  const mint =
    addrFromParts(h1?.mintAddressLow, h1?.mintAddressHigh) ??
    (typeof note?.mint === 'string' ? note.mint : null);
  const sender =
    addrFromParts(h1?.senderAddressLow, h1?.senderAddressHigh) ??
    (typeof note?.sender === 'string' ? note.sender : null);
  const token = claimTokenForMint(mint, solUsd);
  const parts = describeClaimParts({
    sender,
    token,
    amountRaw: note?.amount ?? null,
  });
  return {
    ...parts,
    symbol: token?.symbol ?? null,
    iconUri: token?.iconUri ?? null,
  };
}

export function ClaimsScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ target?: string }>();
  const isEncrypted = params.target === 'encrypted';

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  const { claimSelfToPublic, claimReceived } = useUmbra();
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

  // Page chrome mirrors the History screen: silver for cash, gold for the
  // encrypted balance (same tone split as the History tab).
  const tone: Tone = isEncrypted ? 'gold' : 'silver';
  const palette = txPalette(tone);
  const subtitle = isEncrypted
    ? 'Incoming to your wallet'
    : 'Incoming to your public balance';

  const close = () => router.back();

  const onClaim = (item: Item, index: number) => {
    if (!item.utxo || claimingIndex !== null) return;
    setClaimingIndex(index);

    const bankWallet = user?.bankWallet ?? null;
    const wallet = user?.bankWallet ?? null;
    const claimKey = wallet ? claimScanQueries.byWallet(wallet) : null;

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
      // Return to wherever the claims screen was opened from instead of
      // force-navigating to the Pay hub / Bank tab.
      if (router.canGoBack()) {
        router.back();
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
          if (wallet) {
            queryClient.invalidateQueries({
              queryKey: claimScanQueries.byWallet(wallet),
            });
          }
          if (isEncrypted) {
            if (!wallet) return;
            queryClient.invalidateQueries({
              queryKey: shieldedBalanceQueries.byWallet(wallet),
            });
            queryClient.invalidateQueries({
              queryKey: encryptedBalancesQueries.byWalletPrefix(wallet),
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
        // wrap() already captures StealthError — skip to avoid dup.
        if (err?.name !== 'StealthError') {
          Sentry.captureException(err, {
            tags: { 'op.kind': isEncrypted ? 'claim-encrypted' : 'claim-bank' },
            extra: { userMessage: msg },
          });
        }
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  return (
    <CenterGlow tone={tone} flat>
      {/* Header aligned with the History screen: chevron back, centered
          title + subtitle. Refresh sits on the right (opposite the back
          button) since claims are scanned on demand. */}
      <View
        style={{
          paddingTop: 20,
          paddingBottom: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <GlassBackButton onPress={close} />
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
            Vault
          </Text>
          <Text
            style={[
              sansation,
              { fontSize: 14, lineHeight: 20, color: T.inkDim, marginTop: 4 },
            ]}
          >
            {subtitle}
          </Text>
        </View>
        <LoaderRefreshButton
          onPress={() => refetch()}
          spinning={isFetching}
          size={26}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <EmptyState loading={isFetching} faintColor={palette.inkFaint} />
        ) : (
          <>
            <View
              style={{
                paddingTop: 4,
                paddingBottom: 6,
                flexDirection: 'row',
                alignItems: 'baseline',
              }}
            >
              <Kicker color={palette.inkFaint} style={{ fontSize: 9 }}>
                {items.length} incoming
              </Kicker>
            </View>
            {items.map((tx, i) => {
              const parts = claimPartsForNote(tx.utxo, solUsd);
              return (
                <ClaimItem
                  key={`claim-${i}`}
                  sender={parts.sender}
                  symbol={parts.symbol}
                  iconUri={parts.iconUri}
                  tokenAmount={parts.tokenAmount}
                  usdValue={parts.usdValue}
                  claiming={claimingIndex === i}
                  disabled={claimingIndex !== null && claimingIndex !== i}
                  onClaim={() => onClaim(tx, i)}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Claiming (to encrypted or to cash) requires the wallet to be
          registered on Umbra. Self-hides once registered. */}
      <UmbraSetupOverlay onClose={close} />
    </CenterGlow>
  );
}

/** Token disc with a small "incoming" badge — the left glyph on a claim row.
 *  Falls back to the symbol's first letters when no logo is available. */
function ClaimTokenIcon({
  iconUri,
  symbol,
}: {
  iconUri: string | null;
  symbol: string | null;
}) {
  return (
    <View style={{ width: 42, height: 42 }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            style={{ width: 42, height: 42 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text
            style={[
              sansation,
              {
                fontSize: 13,
                fontWeight: '700',
                color: T.inkDim,
                includeFontPadding: false,
              },
            ]}
          >
            {(symbol ?? '•').slice(0, 3)}
          </Text>
        )}
      </View>

      {/* Incoming badge */}
      <View
        style={{
          position: 'absolute',
          bottom: -2,
          left: -2,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: T.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.arrDownLeft size={11} color={T.ink} />
        </View>
      </View>
    </View>
  );
}

function ClaimItem({
  sender,
  symbol,
  iconUri,
  tokenAmount,
  usdValue,
  claiming,
  disabled,
  onClaim,
}: {
  sender: string | null;
  symbol: string | null;
  iconUri: string | null;
  tokenAmount: string | null;
  usdValue: string | null;
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
        style={{ paddingVertical: 16, paddingHorizontal: 18 }}
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

        {/* Top: token + sender on the left, amount + $ on the right */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ClaimTokenIcon iconUri={iconUri} symbol={symbol} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={[
                sansation,
                {
                  fontSize: 16,
                  fontWeight: '700',
                  color: T.ink,
                  includeFontPadding: false,
                },
              ]}
            >
              {symbol ?? 'Private transfer'}
            </Text>
            {sender ? (
              <Text
                numberOfLines={1}
                style={[
                  sansation,
                  { fontSize: 12, marginTop: 3, includeFontPadding: false },
                ]}
              >
                <Text style={{ color: T.inkFaint }}>from: </Text>
                <Text style={{ color: T.gold, fontWeight: '600' }}>
                  {sender}
                </Text>
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end', minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={[
                sansation,
                {
                  fontSize: 16,
                  fontWeight: '700',
                  color: T.ink,
                  includeFontPadding: false,
                },
              ]}
            >
              {tokenAmount ?? '—'}
            </Text>
            {usdValue ? (
              <Text
                numberOfLines={1}
                style={[
                  sansation,
                  {
                    fontSize: 12,
                    color: T.inkFaint,
                    marginTop: 3,
                    includeFontPadding: false,
                  },
                ]}
              >
                {usdValue}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Bottom: claim action (full width) */}
        <View style={{ marginTop: 14 }}>
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

function EmptyState({
  loading,
  faintColor,
}: {
  loading: boolean;
  faintColor: string;
}) {
  return (
    <View style={{ paddingTop: 80, alignItems: 'center' }}>
      <Text
        style={[
          sansation,
          {
            fontSize: 15,
            color: faintColor,
            textAlign: 'center',
          },
        ]}
      >
        {loading ? 'Loading…' : 'No incoming private transfer'}
      </Text>
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
    progress.set(withTiming(claiming ? 1 : 0, { duration: 280 }));
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
        alignSelf: 'stretch',
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
