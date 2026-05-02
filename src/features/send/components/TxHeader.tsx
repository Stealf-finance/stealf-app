import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { StepBar } from '@/src/design-system/primitives/StepBar';
import { Icons } from '@/src/design-system/icons';
import { Tone } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

type Props = {
  step: number;
  total?: number;
  tone?: Tone;
  onBack: () => void;
  onClose: () => void;
};

export function TxHeader({
  step,
  total = 4,
  tone = 'silver',
  onBack,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: 24,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <BackBtn onPress={onBack} />
      <StepBar current={step} total={total} tone={tone} />
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={10}
        style={{
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icons.close size={22} color={T.ink} strokeWidth={1.6} />
      </Pressable>
    </View>
  );
}
