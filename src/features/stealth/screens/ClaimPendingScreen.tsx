import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
  serif,
} from '@/src/design-system/typography';
import { Palette, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import {
  usePendingClaims,
  pendingClaimsQueries,
} from '@/src/features/stealth/hooks/usePendingClaims';
import {
  usePendingClaimsForCash,
  pendingClaimsForCashQueries,
} from '@/src/features/stealth/hooks/usePendingClaimsForCash';
import { useUmbra } from '@/src/features/stealth/hooks/useUmbra';
import { shieldedBalanceQueries } from '@/src/features/stealth/hooks/useShieldedSolBalance';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';

type Tab = 'coming' | 'incoming';
type Item = { ago: string; utxo: unknown };

function utxoToItem(utxo: any): Item {
  return { ago: 'Encrypted', utxo };
}

const GOLD_GRADIENT: [string, string] = ['#e6c079', '#a37b2e'];

export function ClaimPendingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = txPalette('gold');

  const [tab, setTab] = useState<Tab>('incoming');
  const [tabsWidth, setTabsWidth] = useState(0);
  const tabProgress = useSharedValue(1);

  useEffect(() => {
    tabProgress.value = withTiming(tab === 'incoming' ? 1 : 0, {
      duration: 250,
    });
  }, [tab, tabProgress]);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabProgress.value * (tabsWidth / 2) }],
  }));

  const close = () => router.back();

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: incomingUtxos } = usePendingClaims();
  const { data: comingUtxos } = usePendingClaimsForCash();
  const { claimReceived, claimSelfToPublic, loading } = useUmbra();

  const incoming = useMemo<Item[]>(
    () => (incomingUtxos ?? []).map(utxoToItem),
    [incomingUtxos],
  );
  const coming = useMemo<Item[]>(
    () => (comingUtxos ?? []).map(utxoToItem),
    [comingUtxos],
  );

  const list = tab === 'incoming' ? incoming : coming;
  const headerLabel =
    tab === 'incoming'
      ? `${incoming.length} pending · into shielded pool`
      : `${coming.length} on the way · to bank wallet`;

  const invalidateAfterClaim = async (kind: Tab) => {
    const tasks: Promise<unknown>[] = [];
    if (user?.stealfWallet) {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: pendingClaimsQueries.byStealfWallet(user.stealfWallet),
        }),
      );
    }
    if (user?.bankWallet) {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: pendingClaimsForCashQueries.byBankWallet(user.bankWallet),
        }),
      );
    }
    if (kind === 'incoming' && user?.stealfWallet) {
      // claimReceived → encrypted balance refresh.
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: shieldedBalanceQueries.byStealfWallet(user.stealfWallet),
        }),
      );
    }
    if (kind === 'coming' && user?.bankWallet) {
      // claimSelfToPublic → bank ATA gets credited.
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: balanceQueries.byAddress(user.bankWallet),
        }),
        queryClient.invalidateQueries({
          queryKey: historyQueries.byAddress(user.bankWallet),
        }),
      );
    }
    await Promise.all(tasks);
  };

  const onClaim = async (item: Item) => {
    if (!item.utxo) return;
    try {
      if (tab === 'incoming') {
        await claimReceived([item.utxo]);
      } else {
        await claimSelfToPublic([item.utxo]);
      }
      await invalidateAfterClaim(tab);
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Claim failed';
      if (__DEV__) console.warn('[ClaimPending] claim failed:', msg);
      Alert.alert('Claim failed', msg);
    }
  };

  return (
    <CenterGlow tone="gold">
      <View
        style={{
          paddingTop: insets.top + 16,
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

      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View
          style={{ flexDirection: 'row', position: 'relative' }}
          onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
        >
          {(['coming', 'incoming'] as const).map((id) => {
            const active = tab === id;
            return (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 12,
                      letterSpacing: 3.84,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                      color: active ? T.ink : T.inkFaint,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  {id === 'coming' ? 'Coming' : 'Incoming'}
                </Text>
              </Pressable>
            );
          })}

          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 1,
              backgroundColor: T.hairline,
            }}
          />

          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 2,
                width: '50%',
                backgroundColor: palette.accent,
                shadowColor: palette.accentGlow,
                shadowOpacity: 1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              },
              underlineStyle,
            ]}
          />
        </View>
      </View>

      <View
        style={{
          paddingTop: 24,
          paddingBottom: 22,
          paddingHorizontal: 24,
          alignItems: 'center',
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
          — {headerLabel} —
        </Text>
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
        {list.length === 0 ? (
          <EmptyState kind={tab} palette={palette} />
        ) : (
          list.map((tx, i) => (
            <ClaimItem
              key={`${tab}-${i}`}
              tx={tx}
              kind={tab}
              palette={palette}
              onClaim={() => onClaim(tx)}
              disabled={loading}
            />
          ))
        )}
      </ScrollView>
    </CenterGlow>
  );
}

function ClaimItem({
  tx,
  kind,
  palette,
  onClaim,
  disabled,
}: {
  tx: Item;
  kind: Tab;
  palette: Palette;
  onClaim: () => void;
  disabled?: boolean;
}) {
  const isIncoming = kind === 'incoming';
  return (
    <View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(212,165,83,0.18)',
        opacity: isIncoming ? 1 : 0.85,
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
          <IconChip kind={kind} accent={palette.accent} />

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
              {isIncoming ? 'Encrypted incoming' : 'Encrypted to bank'}
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
            onPress={onClaim}
            disabled={disabled}
            label={isIncoming ? 'Claim into shielded' : 'Claim to bank'}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function EmptyState({ kind, palette }: { kind: Tab; palette: Palette }) {
  const copy =
    kind === 'incoming'
      ? 'No incoming transfers waiting.'
      : 'No transfers on the way to your bank.';
  return (
    <View
      style={{
        paddingTop: 60,
        alignItems: 'center',
      }}
    >
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
        {copy}
      </Text>
    </View>
  );
}

function IconChip({ kind, accent }: { kind: Tab; accent: string }) {
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
      {kind === 'incoming' ? (
        <Icons.arrDown size={16} color={accent} strokeWidth={1.8} />
      ) : (
        <Icons.clock size={16} color={accent} strokeWidth={1.6} />
      )}
    </View>
  );
}

function ClaimButton({
  accentGlow,
  onPress,
  disabled,
  label = 'Claim',
}: {
  accentGlow: string;
  onPress?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Claim"
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 100,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        shadowColor: accentGlow,
        shadowOpacity: 1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <LinearGradient
        colors={GOLD_GRADIENT}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
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
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

