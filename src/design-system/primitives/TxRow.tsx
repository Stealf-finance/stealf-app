import { Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { Icons } from '@/src/design-system/icons';

type Props = {
  type: 'received' | 'sent' | 'other';
  title: string;
  meta: string;
  amount: string;
  last?: boolean;
};

export function TxRow({ type, title, meta, amount, last = false }: Props) {
  const isReceived = type === 'received';
  const iconColor = isReceived ? T.green : type === 'sent' ? T.ink : T.gold;

  return (
    <View
      className="flex-row items-center"
      style={{
        paddingVertical: 14,
        gap: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: T.trace,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: T.bgCardStrong,
          borderWidth: 1,
          borderColor: T.hairline,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isReceived ? (
          <Icons.arrDownLeft size={16} color={iconColor} />
        ) : (
          <Icons.arrUpRight size={16} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text style={[sansation, { fontSize: 15, color: T.ink }]}>{title}</Text>
        <Text style={[sansation, { fontSize: 11, color: T.inkFaint, marginTop: 2 }]}>
          {meta}
        </Text>
      </View>
      <Text
        style={[
          sansation,
          { fontSize: 15, color: isReceived ? T.green : T.ink },
        ]}
      >
        {amount}
      </Text>
    </View>
  );
}
