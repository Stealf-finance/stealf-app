import { Pressable, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export type InputMode = 'asset' | 'fiat';

type Props = {
  label: string;
  iconSource: ImageSource | number;
  tokenLabel: string;
  primaryAmount: string;
  secondaryAmount: string;
  inputMode: InputMode;
  onPressTokenPill?: () => void;
  onToggleMode?: () => void;
  toggleDisabled?: boolean;
  /** Informational balance string shown right under the token pill
   * (e.g. "6.7559 SOL"). Not interactive — actionable percentage
   * shortcuts live elsewhere (above the keyboard). */
  maxLabel?: string;
};

export function SourceAssetCard({
  label,
  iconSource,
  tokenLabel,
  primaryAmount,
  secondaryAmount,
  inputMode,
  onPressTokenPill,
  onToggleMode,
  toggleDisabled = false,
  maxLabel,
}: Props) {
  const digitCount = primaryAmount.replace('.', '').length;
  const amountFontSize =
    digitCount >= 12 ? 32 : digitCount >= 10 ? 40 : digitCount >= 8 ? 52 : 64;

  return (
    <View
      style={{
        marginHorizontal: 20,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 18,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: T.hairline,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 13,
                color: T.inkFaint,
                letterSpacing: 0.2,
              },
            ]}
          >
            {label}
          </Text>

          <Text
            style={[
              sansationLight,
              {
                marginTop: 12,
                fontSize: amountFontSize,
                lineHeight: amountFontSize,
                letterSpacing: amountFontSize * -0.04,
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
            numberOfLines={1}
          >
            {primaryAmount}
          </Text>

          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text
              style={[
                serif,
                {
                  fontSize: 14,
                  lineHeight: 22,
                  fontStyle: 'italic',
                  color: T.inkFaint,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                },
              ]}
            >
              {secondaryAmount}
            </Text>
            {onToggleMode ? (
              <Pressable
                onPress={onToggleMode}
                disabled={toggleDisabled}
                accessibilityRole="button"
                accessibilityLabel={
                  inputMode === 'asset'
                    ? 'Switch to fiat input'
                    : 'Switch to token input'
                }
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: T.hairline,
                  opacity: toggleDisabled ? 0.4 : pressed ? 0.85 : 1,
                })}
              >
                <Icons.swapV size={11} color={T.inkDim} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Pressable
            onPress={onPressTokenPill}
            disabled={!onPressTokenPill}
            accessibilityRole={onPressTokenPill ? 'button' : undefined}
            accessibilityLabel={
              onPressTokenPill
                ? `Select asset, currently ${tokenLabel}`
                : undefined
            }
            hitSlop={6}
            style={({ pressed }) => ({
              opacity: pressed && onPressTokenPill ? 0.85 : 1,
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 38,
                paddingLeft: 6,
                paddingRight: 12,
                borderRadius: 100,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: T.hairline,
              }}
            >
              <Image
                source={iconSource}
                contentFit="contain"
                cachePolicy="memory-disk"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  marginRight: 8,
                }}
              />
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 14,
                    color: T.ink,
                    fontWeight: '600',
                    includeFontPadding: false,
                    marginRight: onPressTokenPill ? 6 : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {tokenLabel}
              </Text>
              {onPressTokenPill ? (
                <Icons.chevD size={12} color={T.inkDim} strokeWidth={2} />
              ) : null}
            </View>
          </Pressable>
          {maxLabel ? (
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  color: T.inkFaint,
                  letterSpacing: 0.6,
                  includeFontPadding: false,
                  paddingHorizontal: 4,
                },
              ]}
            >
              <Text style={{ color: T.inkDim, fontWeight: '700' }}>MAX</Text>
              {' '}
              {maxLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
