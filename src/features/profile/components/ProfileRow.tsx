import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

type Props = {
  /** Bare 3D PNG (Home style). Takes precedence over `iconKey`. */
  image?: number;
  /** Fallback vector icon (bare, no disc) — for rows with no matching PNG. */
  iconKey?: keyof typeof Icons;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Tint the label (e.g. T.error for Delete Account). Defaults to ink. */
  labelColor?: string;
  /** 'link' for external URLs, 'button' otherwise. */
  role?: 'button' | 'link';
};

/** Full-width glass row — bare image (Home language) + label + chevron, one
 *  card per row, same BlurGlass recipe as the Home cards. */
export function ProfileRow({
  image,
  iconKey,
  label,
  onPress,
  disabled = false,
  labelColor = S.ink,
  role = 'button',
}: Props) {
  const Icon = iconKey ? Icons[iconKey] : null;
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
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {image !== undefined ? (
            <Image
              source={image}
              contentFit="contain"
              cachePolicy="memory-disk"
              style={{ width: 26, height: 26 }}
            />
          ) : Icon ? (
            <Icon size={20} color={S.inkDim} />
          ) : null}
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
