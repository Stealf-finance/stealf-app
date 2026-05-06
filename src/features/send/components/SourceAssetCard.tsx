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
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 6,
            paddingLeft: 6,
            paddingRight: 12,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: T.hairline,
            opacity: pressed && onPressTokenPill ? 0.85 : 1,
          })}
        >
          <Image
            source={iconSource}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: '#0a0a0a',
            }}
          />
          <Text
            style={[
              sansation,
              { fontSize: 14, color: T.ink, fontWeight: '600' },
            ]}
          >
            {tokenLabel}
          </Text>
          {onPressTokenPill ? (
            <Icons.chevD size={12} color={T.inkDim} strokeWidth={2} />
          ) : null}
        </Pressable>
      </View>

      <Text
        style={[
          sansationLight,
          {
            marginTop: 6,
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
          marginTop: 8,
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
              fontStyle: 'italic',
              color: T.inkFaint,
              includeFontPadding: false,
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
  );
}
