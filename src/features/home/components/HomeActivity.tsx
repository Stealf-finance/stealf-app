import { Text, View } from 'react-native';
import { sansationLight } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { TxRow } from '@/src/design-system/primitives/TxRow';
import { useHistory } from '@/src/features/bank/hooks/useHistory';
import type { Transaction } from '@/src/features/bank/types';

const ACTIVITY_DISPLAY_LIMIT = 4;

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

export function HomeActivity() {
  const { user } = useAuth();
  const { data: history } = useHistory(user?.bankWallet);
  const txRows =
    history?.transactions.slice(0, ACTIVITY_DISPLAY_LIMIT).map(formatTxRow) ?? [];

  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={[
          sansationLight,
          { fontSize: 22, letterSpacing: -0.44, color: T.ink, marginBottom: 8 },
        ]}
      >
        Recent activity
      </Text>
      {txRows.map((row, i) => (
        <TxRow
          key={`${row.title}-${row.meta}-${i}`}
          type={row.type}
          title={row.title}
          meta={row.meta}
          amount={row.amount}
          last={i === txRows.length - 1}
        />
      ))}
    </View>
  );
}
