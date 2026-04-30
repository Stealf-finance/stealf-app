import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { sansation } from '@/src/design-system/typography';

type Props = {
  leading: ReactNode;
  label: string;
  sub?: ReactNode;
  onPress?: () => void;
  /** Vertical padding override — defaults to 14, the address row uses 16. */
  paddingVertical?: number;
  accessibilityLabel?: string;
  /** When true, dims the row, disables press, and shows a "Soon" pill instead of the chevron. */
  disabled?: boolean;
};

export function GlassListRow({
  leading,
  label,
  sub,
  onPress,
  paddingVertical = 14,
  accessibilityLabel,
  disabled = false,
}: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.015)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical,
          paddingHorizontal: 16,
          minHeight: 64,
        }}
      >
        {/* top inset highlight */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />

        {leading}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 15,
                color: T.ink,
                fontWeight: '400',
                includeFontPadding: false,
              },
            ]}
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
                    marginTop: 3,
                    includeFontPadding: false,
                  },
                ]}
              >
                {sub}
              </Text>
            ) : (
              <View style={{ marginTop: 3 }}>{sub}</View>
            )
          ) : null}
        </View>

        {disabled ? <SoonPill /> : <Icons.chevR size={14} color={T.inkFaint} />}
      </LinearGradient>
    </Pressable>
  );
}

function SoonPill() {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
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
            letterSpacing: 1.6,
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
