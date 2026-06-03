import { Pressable } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

type Props = {
  onPress?: () => void;
  accessibilityLabel?: string;
  size?: number;
  color?: string;
};

export function BackBtn({
  onPress,
  accessibilityLabel = 'Back',
  size = 22,
  color = T.ink,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={{
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icons.chevL size={size} color={color} strokeWidth={1.6} />
    </Pressable>
  );
}
