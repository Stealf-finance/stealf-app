import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { BlurGlass } from '@/src/design-system/primitives/BlurGlass';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

export type ProfileRowGroupItem = {
  iconKey: keyof typeof Icons;
  label: string;
  onPress: () => void;
  /** 'link' for external URLs, 'button' otherwise. */
  role?: 'button' | 'link';
};

/** Several rows grouped in one glass card with hairline separators — same
 *  row anatomy as ProfileRow (44pt disc + label + chevron). */
export function ProfileRowGroup({ items }: { items: ProfileRowGroupItem[] }) {
  return (
    <BlurGlass radius={22}>
      {items.map((item, i) => {
        const Icon = Icons[item.iconKey];
        return (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            accessibilityRole={item.role ?? 'button'}
            accessibilityLabel={item.label}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderBottomWidth: i === items.length - 1 ? 0 : 1,
                borderBottomColor: 'rgba(255,255,255,0.04)',
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
                    color: S.ink,
                    includeFontPadding: false,
                  },
                ]}
              >
                {item.label}
              </Text>
              <Icons.chevR size={14} color={S.inkFaint} />
            </View>
          </Pressable>
        );
      })}
    </BlurGlass>
  );
}
