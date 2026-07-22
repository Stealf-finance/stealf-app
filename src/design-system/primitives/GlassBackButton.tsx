import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

/** Back button — a bare chevron (no chrome). Shared by the wallet-detail and
 *  claims screens. */
export function GlassBackButton({
  onPress,
  size = 26,
  style,
}: {
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      style={style}
    >
      <Icons.chevL size={size} color={T.ink} strokeWidth={2} />
    </Pressable>
  );
}
