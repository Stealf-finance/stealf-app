import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Frame } from '@/src/design-system/primitives/Frame';
import { mono, sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export default function TxDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Frame>
      <View className="flex-1 items-center justify-center px-6">
        <Text style={[serif, { fontSize: 32, color: T.ink, marginBottom: 12 }]}>
          Transaction details
        </Text>
        <Text
          style={[
            sansationLight,
            {
              fontSize: 16,
              color: T.inkFaint,
              textAlign: 'center',
              marginBottom: 16,
            },
          ]}
        >
          Coming soon.
        </Text>
        {id ? (
          <Text style={[mono, { fontSize: 12, color: T.inkMute }]}>
            tx · {id}
          </Text>
        ) : null}
      </View>
    </Frame>
  );
}
