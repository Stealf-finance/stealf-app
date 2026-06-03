import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '@/src/design-system/tokens';
import { sansation } from '@/src/design-system/typography';

type Props = {
  leading: ReactNode;
  label: string;
  sub?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  trailing?: ReactNode;
  /** Max lines for the label. Defaults to 2; pass 1 to keep it on one line
   *  (the font auto-shrinks more aggressively to fit). */
  labelNumberOfLines?: number;
  /** Base label font size before auto-shrink. Defaults to 15. */
  labelFontSize?: number;
};

export function GlassTile({
  leading,
  label,
  sub,
  onPress,
  accessibilityLabel,
  disabled = false,
  trailing,
  labelNumberOfLines = 2,
  labelFontSize = 15,
}: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={{
        flex: 1,
        aspectRatio: 1,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          flex: 1,
          paddingVertical: 16,
          paddingHorizontal: 14,
          justifyContent: 'space-between',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          {leading}
          {trailing ?? null}
        </View>

        {/* "Soon" sits as an absolute corner badge so it never competes with
            the leading icon for horizontal space (lets wide icons go full size). */}
        {disabled && !trailing ? (
          <View style={{ position: 'absolute', top: 10, right: 10 }}>
            <SoonPill />
          </View>
        ) : null}

        <View>
          <Text
            style={[
              sansation,
              {
                fontSize: labelFontSize,
                lineHeight: labelFontSize + 4,
                color: T.ink,
                fontWeight: '400',
                includeFontPadding: false,
              },
            ]}
            numberOfLines={labelNumberOfLines}
            adjustsFontSizeToFit
            minimumFontScale={labelNumberOfLines === 1 ? 0.6 : 0.85}
          >
            {label}
          </Text>
          {sub != null ? (
            typeof sub === 'string' ? (
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 11,
                    color: T.inkFaint,
                    marginTop: 4,
                    includeFontPadding: false,
                  },
                ]}
                numberOfLines={1}
              >
                {sub}
              </Text>
            ) : (
              <View style={{ marginTop: 4 }}>{sub}</View>
            )
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function SoonPill() {
  return (
    <View
      style={{
        flexShrink: 0,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: T.hairline,
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <Text
        style={[
          sansation,
          {
            fontSize: 9,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: T.inkFaint,
            fontWeight: '700',
          },
        ]}
      >
        Soon
      </Text>
    </View>
  );
}
