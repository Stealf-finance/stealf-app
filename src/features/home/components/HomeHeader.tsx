import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = { name?: string | null; hidden: boolean; onToggleHidden: () => void };

export function HomeHeader({ name, hidden, onToggleHidden }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 8,
      }}
    >
      <Text style={[sansation, { fontSize: 14, color: T.inkDim }]}>
        Hi{name ? ', ' : ''}
        {name ? <Text style={{ color: T.ink, fontWeight: '600' }}>{name}</Text> : null}
      </Text>
      <Pressable
        onPress={onToggleHidden}
        accessibilityRole="button"
        accessibilityLabel="Toggle balance visibility"
        hitSlop={10}
        style={({ pressed }) => ({
          padding: 4,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {hidden ? (
          <Icons.eyeOff size={20} color={T.inkDim} />
        ) : (
          <Icons.eye size={20} color={T.inkDim} />
        )}
      </Pressable>
    </View>
  );
}
