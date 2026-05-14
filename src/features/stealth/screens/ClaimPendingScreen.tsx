import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { RefreshBtn } from '@/src/design-system/primitives/RefreshBtn';
import { Icons } from '@/src/design-system/icons';
import { mono, sansation, serif } from '@/src/design-system/typography';
import { Palette, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { usePendingClaims } from '@/src/features/stealth/hooks/usePendingClaims';
import { claimScanQueries } from '@/src/features/stealth/hooks/useClaimScan';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { shieldedBalanceQueries } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { usePendingOps } from '@/src/components/pending-ops/PendingOpsContext';

const GOLD_GRADIENT: [string, string] = ['#e6c079', '#a37b2e'];
const ANIM_HOLD_MS = 480;

type Item = { ago: string; utxo: unknown };

function utxoToItem(utxo: any): Item {
  return { ago: 'Encrypted', utxo };
}

export function ClaimPendingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = txPalette('gold');

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingOps = usePendingOps();
  // Force a fresh scan on screen mount — this is the user-facing source
  // of truth for pending claims. The badge on the stealth tab reads the
  // cached result instead of triggering its own scan.
  const {
    data: incomingUtxos,
    refetch,
    isFetching,
  } = usePendingClaims({ fetch: true });
  const { claimReceived } = useUmbra();

  const items: Item[] = (incomingUtxos ?? []).map(utxoToItem);
  const [claimingIndex, setClaimingIndex] = useState<number | null>(null);

  const close = () => router.back();

  const onClaim = (item: Item, index: number) => {
    if (!item.utxo || claimingIndex !== null) return;
    setClaimingIndex(index);

    const stealfWallet = user?.stealfWallet ?? null;

    const opId = pendingOps.enqueue({
      kind: 'claim-to-shielded',
      tone: 'gold',
      amountSol: 0,
    });


    setTimeout(() => {

      if (router.canGoBack()) {
        router.replace('/(tabs)/stealth');
      }
    }, ANIM_HOLD_MS);

    void (async () => {
      const provingTimer = setTimeout(() => {
        pendingOps.setPhase(opId, 'proving');
      }, 700);

      try {
        await claimReceived([item.utxo]);
        clearTimeout(provingTimer);
        pendingOps.setPhase(opId, 'confirming');

        const invalidate = () => {
          if (!stealfWallet) return;
          queryClient.invalidateQueries({
            queryKey: claimScanQueries.byStealfWallet(stealfWallet),
          });
          queryClient.invalidateQueries({
            queryKey: shieldedBalanceQueries.byStealfWallet(stealfWallet),
          });
          queryClient.invalidateQueries({
            queryKey: ['stealth', 'encrypted-balances', stealfWallet],
          });
        };
        invalidate();
        [3000, 8000, 15000].forEach((d) => setTimeout(invalidate, d));

        pendingOps.complete(opId, 'done');
      } catch (err: any) {
        clearTimeout(provingTimer);
        const msg = err?.userMessage || err?.message || 'Claim failed';
        if (__DEV__) console.warn('[ClaimPending] claim failed:', msg);
        pendingOps.complete(opId, 'failed', msg);
      }
    })();
  };

  return (
    <CenterGlow tone="gold">
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 18,
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
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
              marginRight: 36,
            },
          ]}
        >
          Claim pending
        </Text>
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
              color: 'rgba(230,192,121,0.85)',
              fontWeight: '700',
            },
          ]}
        >
          {items.length} pending · into encrypted balance
        </Text>
        <RefreshBtn onPress={() => refetch()} spinning={isFetching} />
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
        {items.length === 0 ? (
          <EmptyState palette={palette} />
        ) : (
          items.map((tx, i) => (
            <ClaimItem
              key={`incoming-${i}`}
              tx={tx}
              palette={palette}
              claiming={claimingIndex === i}
              disabled={claimingIndex !== null && claimingIndex !== i}
              onClaim={() => onClaim(tx, i)}
            />
          ))
        )}
      </ScrollView>
    </CenterGlow>
  );
}

function ClaimItem({
  tx,
  palette,
  claiming,
  disabled,
  onClaim,
}: {
  tx: Item;
  palette: Palette;
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
        borderColor: 'rgba(212,165,83,0.18)',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <LinearGradient
        colors={['rgba(212,165,83,0.10)', 'rgba(163,123,46,0.03)']}
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
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <IconChip accent={palette.accent} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                serif,
                {
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: T.ink,
                  fontWeight: '500',
                  includeFontPadding: false,
                },
              ]}
            >
              Encrypted incoming
            </Text>
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
              {tx.ago}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <ClaimButton
            accentGlow={palette.accentGlow}
            claiming={claiming}
            disabled={disabled}
            onPress={onClaim}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function EmptyState({ palette }: { palette: Palette }) {
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
        No incoming transfers waiting.
      </Text>
    </View>
  );
}

function IconChip({ accent }: { accent: string }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Icons.arrDown size={16} color={accent} strokeWidth={1.8} />
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
      accessibilityLabel="Claim into shielded"
      onPress={onPress}
      disabled={claiming || disabled}
      style={{
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
            Claim into shielded
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
