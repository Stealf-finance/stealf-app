import { View } from 'react-native';
import { Frame } from '@/src/design-system/primitives/Frame';
import { ActionBtn } from '@/src/design-system/primitives/ActionBtn';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

export default function Index() {
  return (
    <Frame>
      <View className="flex-1 items-center justify-center flex-row" style={{ gap: 24 }}>
        <ActionBtn icon={<Icons.eye size={18} color={T.ink} />} label="Show" />
        <ActionBtn icon={<Icons.lock size={18} color={T.ink} />} label="Freeze" />
        <ActionBtn
          icon={<Icons.bolt size={20} color="#0a0a0a" />}
          label="Send"
          accent
          large
        />
      </View>
    </Frame>
  );
}
