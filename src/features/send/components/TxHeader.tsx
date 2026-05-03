import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { CloseBtn } from '@/src/design-system/primitives/CloseBtn';
import { StepBar } from '@/src/design-system/primitives/StepBar';
import { Tone } from '@/src/design-system/palettes';

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
      <CloseBtn onPress={onClose} />
    </View>
  );
}
