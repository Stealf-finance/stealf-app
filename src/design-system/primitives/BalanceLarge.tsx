import { Text, View } from 'react-native';
import { sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Kicker } from './Kicker';

type Props = {
  amount: string;
  label?: string;
  align?: 'left' | 'center';
};

export function BalanceLarge({ amount, label = 'Available', align = 'left' }: Props) {
  const [big, cents] = amount.split('.');
  return (
    <View style={{ paddingVertical: 8, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Kicker style={{ marginBottom: 10 }}>{label}</Kicker>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 4,
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        }}
      >
        <Text style={[serif, { fontSize: 30, color: T.gold, lineHeight: 30 }]}>$</Text>
        <Text
          style={[
            sansationLight,
            { fontSize: 64, letterSpacing: -2.2, lineHeight: 64, color: T.ink },
          ]}
        >
          {big}
        </Text>
        {cents != null && (
          <Text
            style={[
              sansationLight,
              { fontSize: 32, letterSpacing: -0.6, color: T.inkDim },
            ]}
          >
            .{cents}
          </Text>
        )}
      </View>
    </View>
  );
}
