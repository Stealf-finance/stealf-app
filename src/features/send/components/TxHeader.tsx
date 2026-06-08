import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  title: string;
  onBack: () => void;
};

export function TxHeader({ title, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <BackBtn onPress={onBack} />
      <Text
        style={[
          sansation,
          {
            flex: 1,
            textAlign: 'center',
            fontSize: 32,
            fontWeight: '600',
            color: T.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {title}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  );
}
