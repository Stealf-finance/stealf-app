import { Pressable, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Props = {
  iconSource: ImageSource | number;
  /** Bold label — asset name or symbol. */
  name: string;
  /** Available balance line, e.g. "0.03987 SOL". */
  balanceLabel: string;
  onPressSelect?: () => void;
  onPressMax?: () => void;
};

/**
 * Asset selector row — icon + name/balance on the left, a "Use Max" pill on
 * the right. Tapping the left side opens the asset picker. Matches the
 * reference card shown for the Shield flow.
 */
export function AssetSelectRow({
  iconSource,
  name,
  balanceLabel,
  onPressSelect,
  onPressMax,
}: Props) {
  return (
    <View
      style={{
        marginHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
      }}
    >
      {/* flex:1 lives on a static wrapper (not the Pressable style-function)
          so it actually expands and pushes "Use Max" to the right edge. */}
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={onPressSelect}
          disabled={!onPressSelect}
          accessibilityRole={onPressSelect ? 'button' : undefined}
          accessibilityLabel={
            onPressSelect ? `Select asset, currently ${name}` : undefined
          }
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed && onPressSelect ? 0.85 : 1 })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={iconSource}
              contentFit="contain"
              cachePolicy="memory-disk"
              style={{ width: 38, height: 38, borderRadius: 19, marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text
                  style={[
                    sansation,
                    {
                      fontSize: 16,
                      fontWeight: '600',
                      color: T.ink,
                      includeFontPadding: false,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {onPressSelect ? (
                  <Icons.chevD size={13} color={T.inkFaint} strokeWidth={2} />
                ) : null}
              </View>
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 13,
                    color: T.inkFaint,
                    marginTop: 2,
                    includeFontPadding: false,
                  },
                ]}
                numberOfLines={1}
              >
                {balanceLabel}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      <Pressable
        onPress={onPressMax}
        disabled={!onPressMax}
        accessibilityRole="button"
        accessibilityLabel="Use max balance"
        hitSlop={6}
        style={({ pressed }) => ({ opacity: pressed && onPressMax ? 0.85 : 1 })}
      >
        <View
          style={{
            paddingVertical: 9,
            paddingHorizontal: 16,
            borderRadius: 100,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 13,
                fontWeight: '600',
                color: T.ink,
                includeFontPadding: false,
              },
            ]}
          >
            Use Max
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
