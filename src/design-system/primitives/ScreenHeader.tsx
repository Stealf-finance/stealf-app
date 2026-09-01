import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackButton } from './GlassBackButton';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

/** Where the header sits. See .claude/docs/screen-patterns.md. */
export type HeaderTop = 'hero' | 'inset' | 'list' | 'tab' | 'none';

type Props = {
  title: string;
  /** 14pt line under the title. */
  subtitle?: string;
  /** 3D asset via require(...), 32pt, left of the title. */
  icon?: number;
  onBack?: () => void;
  /** Trailing control. Its width can't shift the title — see below. */
  right?: ReactNode;
  /** Let a long title shrink rather than truncate. */
  adjustFontSize?: boolean;
  top?: HeaderTop;
  gutter?: number;
  style?: StyleProp<ViewStyle>;
};

const SIDE = 26;
/** Clearance each side of the centred title. Symmetric, so centring holds. */
const TITLE_INSET = 40;

export function ScreenHeader({
  title,
  subtitle,
  icon,
  onBack,
  right,
  adjustFontSize,
  top = 'inset',
  gutter = 24,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop =
    top === 'hero'
      ? insets.top + 16
      : top === 'inset'
        ? insets.top
        : top === 'tab'
          ? insets.top + 8
          : top === 'list'
            ? 20
            : 0;

  const rowHeight = subtitle ? 62 : 38;

  return (
    <View
      style={[
        { paddingTop, paddingBottom: 14, paddingHorizontal: gutter },
        style,
      ]}
    >
      <View
        style={{
          height: rowHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {onBack ? (
          <GlassBackButton onPress={onBack} />
        ) : (
          <View style={{ width: SIDE }} />
        )}
        {right ?? <View style={{ width: SIDE }} />}

        {/* Centred on the row, so a wide `right` can't shift it. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: TITLE_INSET,
            right: TITLE_INSET,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {icon ? (
              <Image
                source={icon}
                style={{ width: 32, height: 32 }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : null}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={adjustFontSize}
              minimumFontScale={adjustFontSize ? 0.75 : undefined}
              style={[
                sansation,
                {
                  fontSize: 22,
                  lineHeight: 28,
                  fontWeight: '600',
                  color: T.ink,
                  includeFontPadding: false,
                },
              ]}
            >
              {title}
            </Text>
          </View>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[
                sansation,
                {
                  fontSize: 14,
                  lineHeight: 20,
                  color: T.inkDim,
                  marginTop: 4,
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
