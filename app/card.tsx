import { Text, View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { sansationLight, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export default function CardModal() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center px-6">
        <Text style={[serif, { fontSize: 32, color: T.ink, marginBottom: 12 }]}>
          Stealf card
        </Text>
        <Text
          style={[
            sansationLight,
            { fontSize: 16, color: T.inkFaint, textAlign: 'center' },
          ]}
        >
          Coming soon.
        </Text>
      </View>
    </Frame>
  );
}
