import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { StepBar } from '@/src/design-system/primitives/StepBar';
import { Icons } from '@/src/design-system/icons';
import { Tone, txPalette } from '@/src/design-system/palettes';

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
  const palette = txPalette(tone);
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: 20,
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
        <Icons.close size={18} color={palette.inkDim} />
      </Pressable>
    </View>
  );
}
