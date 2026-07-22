import { View } from 'react-native';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { GreetingSlot } from '@/src/components/GreetingSlot';
import { useToast } from '@/src/components/toast/ToastContext';

/** Home top bar: greeting on the left, a notification bell on the right.
 *  The bell is a placeholder (coming-soon toast) for now. */
export function HomeHeader() {
  const { show } = useToast();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        paddingBottom: 8,
      }}
    >
      <GreetingSlot />
      <CircleIconBtn
        iconKey="bell"
        tone="silver"
        accessibilityLabel="Notifications"
        onPress={() =>
          show({
            kind: 'info',
            title: 'Coming soon',
            message: 'Notifications are coming soon.',
          })
        }
      />
    </View>
  );
}
