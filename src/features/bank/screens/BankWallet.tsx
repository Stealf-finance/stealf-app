import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { SquareActionTile } from '@/src/design-system/primitives/SquareActionTile';
import { TxRow } from '@/src/design-system/primitives/TxRow';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useHistory } from '@/src/features/bank/hooks/useHistory';
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
  const { data: balance } = useBalance(user?.bankWallet);
  const { data: history } = useHistory(user?.bankWallet);

  const greeting = user?.username ?? '';
  const { dollars, cents } = splitBalance(balance?.totalUSD ?? 0);
  const txRows =
    history?.transactions.slice(0, HISTORY_DISPLAY_LIMIT).map(formatTxRow) ?? [];

  return (
    <View style={{ flex: 1 }}>
      {/* Greeting row */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: S.inkDim, fontWeight: '300' }}>
          Good morning, <Text style={{ color: S.ink }}>{greeting}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleIconBtn iconKey="card" onPress={() => router.push('/card')} />
          <CircleIconBtn iconKey="bell" hasDot />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Kicker + balance */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <View
              style={{ width: 18, height: 1, backgroundColor: S.accentDim }}
            />
            <Text
              style={[
                sansation,
                {
                  fontSize: 10,
                  letterSpacing: 3.2,
                  textTransform: 'uppercase',
                  color: S.accent,
                  fontWeight: '700',
                },
              ]}
            >
              Bank Wallet
            </Text>
            <View
              style={{ width: 18, height: 1, backgroundColor: S.accentDim }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
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
              {dollars}
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
              {cents}
            </Text>
          </View>
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
            onPress={() => router.push('/send-money')}
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
          paddingTop: 28,
          paddingHorizontal: 26,
          paddingBottom: 26,
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
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 18,
          }}
        >
          <View
            style={{ width: 22, height: 1, backgroundColor: S.accentDim }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 11,
                letterSpacing: 3.52,
                textTransform: 'uppercase',
                color: S.accent,
                fontWeight: '700',
              },
            ]}
          >
            Bank without limits
          </Text>
          <View
            style={{ width: 22, height: 1, backgroundColor: S.accentDim }}
          />
        </View>

        <Text
          style={[
            sansationLight,
            {
              fontSize: 26,
              letterSpacing: -0.65,
              lineHeight: 31,
              color: S.ink,
              textAlign: 'center',
              marginBottom: 4,
            },
          ]}
        >
          Your physical card
        </Text>
        <Text
          style={[
            serif,
            {
              fontSize: 15,
              fontStyle: 'italic',
              color: S.accent,
              textAlign: 'center',
              marginBottom: 22,
            },
          ]}
        >
          Ships within 48h.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Pressable
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
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
              Get your bank account
            </Text>
            <Icons.arrRight size={12} color={S.ink} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
