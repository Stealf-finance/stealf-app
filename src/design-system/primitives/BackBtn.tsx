import { Pressable } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

type Props = {
  onPress?: () => void;
  accessibilityLabel?: string;
  size?: number;
  color?: string;
  /** Render a chevron (‹) instead of the full arrow. */
  chevron?: boolean;
};

export function BackBtn({
  onPress,
  accessibilityLabel = 'Back',
  size = 22,
  color = T.ink,
  chevron = true,
}: Props) {
  const Icon = chevron ? Icons.chevL : Icons.arrLeft;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={{
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        ...(chevron
          ? {
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }
          : null),
      }}
    >
      <Icon size={chevron ? size + 2 : size} color={color} strokeWidth={1.8} />
    </Pressable>
  );
}
