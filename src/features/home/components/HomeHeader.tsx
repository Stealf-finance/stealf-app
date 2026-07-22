import { Pressable, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { GreetingSlot } from '@/src/components/GreetingSlot';
import { useToast } from '@/src/components/toast/ToastContext';

/** Home top bar: greeting on the left, a bare notification bell on the right
 *  (no circular chrome). The bell is a placeholder (coming-soon toast). */
export function HomeHeader() {
  const { show } = useToast();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingBottom: 8,
      }}
    >
      <GreetingSlot />
      <Pressable
        onPress={() =>
          show({
            kind: 'info',
            title: 'Coming soon',
            message: 'Notifications are coming soon.',
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={12}
        style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
      >
        <Icons.bell size={24} color={T.ink} />
      </Pressable>
    </View>
  );
}
