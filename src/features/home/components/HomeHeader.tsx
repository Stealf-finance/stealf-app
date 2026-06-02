import { View } from 'react-native';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { useToast } from '@/src/components/toast/ToastContext';

/** Top bar: card + notifications shortcuts (both parked as "coming soon"). */
export function HomeHeader() {
  const { show } = useToast();
  const soon = (label: string) =>
    show({ kind: 'info', title: 'Coming soon', message: `${label} are coming soon.` });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        paddingBottom: 8,
      }}
    >
      <CircleIconBtn iconKey="card" tone="silver" onPress={() => soon('Cards')} />
      <CircleIconBtn iconKey="bell" tone="silver" hasDot onPress={() => soon('Notifications')} />
    </View>
  );
}
