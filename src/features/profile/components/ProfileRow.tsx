import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

type Props = {
  iconKey: keyof typeof Icons;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Tint the label (e.g. T.error for Delete Account). Defaults to ink. */
  labelColor?: string;
  /** 'link' for external URLs, 'button' otherwise. */
  role?: 'button' | 'link';
};

/** Full-width glass row — icon disc + label + chevron, one card per row
 *  (reference layout), same BlurGlass recipe as the Home cards. */
export function ProfileRow({
  iconKey,
  label,
  onPress,
  disabled = false,
  labelColor = S.ink,
  role = 'button',
}: Props) {
  const Icon = Icons[iconKey];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}
    >
      <BlurGlass
        radius={22}
        innerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: S.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={S.accent} />
        </View>
        <Text
          style={[
            sansation,
            {
              flex: 1,
              fontSize: 14,
              lineHeight: 20,
              color: labelColor,
              includeFontPadding: false,
            },
          ]}
        >
          {label}
        </Text>
        <Icons.chevR size={14} color={S.inkFaint} />
      </BlurGlass>
    </Pressable>
  );
}
