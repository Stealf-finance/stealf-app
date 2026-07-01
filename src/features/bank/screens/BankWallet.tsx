import { useCallback, useState } from 'react';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { BalanceSkeleton } from '@/src/design-system/primitives/BalanceSkeleton';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { SquareActionTile } from '@/src/design-system/primitives/SquareActionTile';
import { TxRow } from '@/src/design-system/primitives/TxRow';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useBalanceVisibility } from '@/src/features/wallet/BalanceVisibilityContext';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { getGreeting } from '@/src/lib/greeting';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useHistory } from '@/src/features/bank/hooks/useHistory';
import { balanceQueries } from '@/src/features/bank/api/balance';
import { historyQueries } from '@/src/features/bank/api/history';
import type { Transaction } from '@/src/features/bank/types';

const S = txPalette('silver');

const HISTORY_DISPLAY_LIMIT = 4;

function splitBalance(usd: number): { dollars: string; cents: string } {
  const fixed = Math.max(0, usd).toFixed(2);
  const [dollars, cents] = fixed.split('.');
  return { dollars, cents: `.${cents}` };
}

function formatTxRow(tx: Transaction): {
  type: 'sent' | 'received';
  title: string;
  meta: string;
  amount: string;
} {
  const direction = tx.type === 'sent' ? 'Sent' : 'Received';
  const sign = tx.type === 'sent' ? '−' : '+';
  const amountStr = `${sign}$${Math.abs(tx.amountUSD).toFixed(2)}`;
  return {
    type: tx.type === 'sent' ? 'sent' : 'received',
    title: `${direction} · ${tx.tokenSymbol}`,
    meta: tx.dateFormatted,
    amount: amountStr,
  };
}

export function BankWallet() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const showComingSoon = useCallback(
    (feature: string) =>
      toast.show({
        kind: 'info',
        title: 'Coming soon',
        message: `${feature} are not live yet — stay tuned.`,
      }),
    [toast],
  );
  const { data: balance, isLoading: balanceLoading } = useBalance(
    user?.bankWallet,
  );
  const { data: history } = useHistory(user?.bankWallet);

  const username = user?.username ?? '';
  const greeting = getGreeting();
  // Distinguish "not yet loaded" (skeleton) from "loaded with $0.00".
  // splitBalance only runs when balance.totalUSD is defined for real.
  const balanceReady = balance !== undefined;
  const { dollars, cents } = balanceReady
    ? splitBalance(balance.totalUSD)
    : { dollars: '', cents: '' };
  const txRows =
    history?.transactions.slice(0, HISTORY_DISPLAY_LIMIT).map(formatTxRow) ?? [];
  const { hidden: balanceHidden, toggle: toggleBalanceHidden } =
    useBalanceVisibility();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    const addr = user?.bankWallet;
    if (!addr) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: balanceQueries.byAddress(addr),
        }),
        queryClient.invalidateQueries({
          queryKey: historyQueries.byAddress(addr),
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, user?.bankWallet]);

  return (
    <View style={{ flex: 1 }}>
      {/* Greeting row */}
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: S.inkDim, fontWeight: '300' }}>
          {greeting}, <Text style={{ color: S.ink }}>{username}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleIconBtn
            iconKey="card"
            onPress={() => showComingSoon('Cards')}
          />
          <CircleIconBtn
            iconKey="bell"
            hasDot
            onPress={() => showComingSoon('Notifications')}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
            progressBackgroundColor="#1c1c1e"
          />
        }
      >
        {/* Kicker + eye toggle. Mirrors the StealthHub header so the
            two tabs feel like the same wallet shell. */}
        <View
          style={{
            paddingTop: 12,
            marginBottom: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
          }}
        >
          <Kicker color={T.ink} style={{ letterSpacing: 3.2 }}>
            Virtual bank account
          </Kicker>
          <Pressable
            onPress={toggleBalanceHidden}
            accessibilityRole="button"
            accessibilityLabel={
              balanceHidden ? 'Show balance' : 'Hide balance'
            }
            hitSlop={10}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {balanceHidden ? (
              <Icons.eyeOff size={22} color={T.ink} />
            ) : (
              <Icons.eye size={22} color={T.ink} />
            )}
          </Pressable>
        </View>

        {/* Balance — same vertical breathing as StealthHub
            (marginTop 30 + marginBottom 48 around the hero). */}
        <View
          style={{
            alignItems: 'center',
            marginTop: 30,
            marginBottom: 48,
          }}
        >
          {!balanceReady && balanceLoading && !balanceHidden ? (
            <BalanceSkeleton tone="silver" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              {balanceHidden ? null : (
                <Text
                  style={[
                    serif,
                    {
                      fontSize: 36,
                      color: S.accent,
                      fontStyle: 'italic',
                      lineHeight: 36,
                      includeFontPadding: false,
                    },
                  ]}
                >
                  $
                </Text>
              )}
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 76,
                    letterSpacing: -3.04,
                    lineHeight: 76,
                    color: S.ink,
                    includeFontPadding: false,
                  },
                ]}
              >
                {balanceHidden ? '****' : dollars}
              </Text>
              <Text
                style={[
                  sansationLight,
                  {
                    fontSize: 32,
                    color: S.inkDim,
                    letterSpacing: -0.64,
                    lineHeight: 32,
                    includeFontPadding: false,
                  },
                ]}
              >
                {balanceHidden ? '' : cents}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: S.hairline,
            marginBottom: 22,
          }}
        />

        {/* Action tiles */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingBottom: 28,
          }}
        >
          <SquareActionTile
            iconKey="arrDown"
            label="Receive"
            onPress={() => router.push('/receive')}
          />
          <SquareActionTile
            iconKey="move"
            label="Move"
            accent
            accentTone="silver"
            onPress={() => router.push('/moove?direction=bank-to-shielded')}
          />
          <SquareActionTile
            iconKey="arrUp"
            label="Send"
            onPress={() => router.push('/send')}
          />
          <SquareActionTile
            iconKey="bolt"
            label="Borrow"
            onPress={() => router.push('/borrow')}
          />
        </View>

        <CardPromo />

        {/* Transactions header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 4,
          }}
        >
          <Text
            style={[
              sansationLight,
              { fontSize: 22, letterSpacing: -0.44, color: S.ink },
            ]}
          >
            Transactions
          </Text>
          <Pressable
            onPress={() => router.push('/transactions')}
            accessibilityRole="link"
            accessibilityLabel="See all transactions"
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text
              style={[
                serif,
                { fontSize: 13, color: S.accent, fontStyle: 'italic' },
              ]}
            >
              see all
            </Text>
            <Icons.arrRight size={11} color={S.accent} />
          </Pressable>
        </View>

        <View style={{ paddingTop: 6 }}>
          {txRows.length === 0 ? (
            <Text
              style={[
                serif,
                {
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: S.inkFaint,
                  textAlign: 'center',
                  paddingVertical: 28,
                },
              ]}
            >
              No transactions yet
            </Text>
          ) : (
            txRows.map((row, i) => (
              <TxRow
                key={`${row.title}-${row.meta}-${i}`}
                type={row.type}
                title={row.title}
                meta={row.meta}
                amount={row.amount}
                last={i === txRows.length - 1}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function CardPromo() {
  const toast = useToast();
  return (
    <View
      style={{
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        marginBottom: 28,
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 20 },
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingTop: 22,
          paddingHorizontal: 22,
          paddingBottom: 18,
        }}
      >
        {/* top sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Image
            source={require('@/assets/images/bank-icon.png')}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{
              width: 110,
              height: 78,
              marginTop: 6,
            }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                sansationLight,
                {
                  fontSize: 22,
                  letterSpacing: -0.4,
                  lineHeight: 26,
                  color: S.ink,
                  marginBottom: 6,
                },
              ]}
            >
              Global bank account
            </Text>
            <Text
              style={[
                sansation,
                {
                  fontSize: 13,
                  lineHeight: 18,
                  color: S.inkDim,
                },
              ]}
            >
              Your bridge to the real world.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your account"
          onPress={() =>
            toast.show({
              kind: 'info',
              title: 'Coming soon',
              message: 'Virtual bank accounts are not live yet — stay tuned.',
            })
          }
          style={{
            paddingVertical: 14,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
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
                fontSize: 11,
                letterSpacing: 2.64,
                textTransform: 'uppercase',
                color: S.ink,
                fontWeight: '700',
              },
            ]}
          >
            Open your account
          </Text>
          <Icons.arrRight size={12} color={S.ink} />
        </Pressable>
      </LinearGradient>
    </View>
  );
}
