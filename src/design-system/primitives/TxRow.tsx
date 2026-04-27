import { Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { Tone, txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  type: 'received' | 'sent';
  title: string;
  meta: string;
  amount: string;
  last?: boolean;
  tone?: Tone;
};

export function TxRow({
  type,
  title,
  meta,
  amount,
  last,
  tone = 'silver',
}: Props) {
  const palette = txPalette(tone);
  const isReceived = type === 'received';
  const Icon = isReceived ? Icons.arrDownRight : Icons.arrUp;

  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: T.trace,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={26} color="#ffffff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: palette.ink }}>{title}</Text>
        <Text style={{ fontSize: 11, color: palette.inkFaint, marginTop: 2 }}>
          {meta}
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: palette.ink }}>{amount}</Text>
    </View>
  );
}
