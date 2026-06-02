import { Text, View } from 'react-native';
import { sansation, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  kicker: string;
  amountUSD: number;
  secondary?: string;
  hidden?: boolean;
};

function splitUsd(usd: number): { int: string; dec: string } {
  const [int, dec = '00'] = Math.abs(usd).toFixed(2).split('.');
  return { int: `${usd < 0 ? '-' : ''}$${Number(int).toLocaleString()}`, dec };
}

export function BalanceCard({ kicker, amountUSD, secondary, hidden }: Props) {
  const { int, dec } = splitUsd(amountUSD);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
      <Text
        style={[
          sansation,
          { fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: T.inkFaint, marginBottom: 8 },
        ]}
      >
        {kicker}
      </Text>
      {hidden ? (
        <Text style={[serif, { fontSize: 44, color: T.ink }]}>••••</Text>
      ) : (
        <Text style={{ color: T.ink }}>
          <Text style={[serif, { fontSize: 46, letterSpacing: -1 }]}>{int}</Text>
          <Text style={[serif, { fontSize: 28, color: T.inkDim }]}>.{dec}</Text>
        </Text>
      )}
      {secondary ? (
        <Text style={[sansation, { fontSize: 11, color: T.inkFaint, marginTop: 6 }]}>{secondary}</Text>
      ) : null}
    </View>
  );
}
