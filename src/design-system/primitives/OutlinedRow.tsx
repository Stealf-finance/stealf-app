import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

type Props = {
  /** Leading mark — a token image or an icon disc, sized 34 by the caller. */
  icon: ReactNode;
  /** ReactNode, not string, so a caller can colour part of the line (the APY
   *  on the STLF row). */
  title: ReactNode;
  subtitle: string;
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * A suggestion row: outlined rather than filled, so it reads as a prompt and
 * not as another balance. Same grey-contour treatment as the Points card on
 * Profile — kept here so the balance screens' rows can't drift apart.
 */
export function OutlinedRow({
  icon,
  title,
  subtitle,
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.16)',
        }}
      >
        {icon}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 15,
                lineHeight: 20,
                fontWeight: '600',
                letterSpacing: -0.2,
                color: S.ink,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 13,
                lineHeight: 17,
                color: S.inkDim,
                marginTop: 2,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <Icons.chevR size={14} color={S.inkFaint} />
      </View>
    </Pressable>
  );
}
