import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';

// Stub picker: today only SOL is the live asset, USDC sits as a teaser.
// Mainnet rollout will widen this list and propagate the choice back to
// the calling Move/Shield flow.
type TokenRow = {
  symbol: string;
  name: string;
  iconSource: number;
  price: number | null;
};

const palette = txPalette('silver');

export function AssetPickerScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { data: solPrice } = useSolPrice();

  const close = () => router.back();

  const tokens: TokenRow[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      iconSource: require('@/assets/images/solana-icon.png'),
      price: typeof solPrice === 'number' ? solPrice : null,
    },
    {
      symbol: 'USDC',
      name: 'Solana',
      iconSource: require('@/assets/images/usdc.png'),
      price: 1,
    },
  ];

  return (
    <CenterGlow tone="silver" flat>
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <BackBtn onPress={close} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
              marginRight: 36,
            },
          ]}
        >
          Select asset
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {tokens.map((t) => {
          const priceLabel =
            t.price !== null
              ? `$${t.price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '—';
          return (
            <Pressable
              key={t.symbol}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={`Select ${t.symbol} on ${t.name}`}
              style={{
                width: '100%',
                marginBottom: 8,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: palette.hairline,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Image
                  source={t.iconSource}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  style={{ width: 44, height: 44 }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 16,
                        color: palette.ink,
                        includeFontPadding: false,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {t.symbol}
                  </Text>
                  <Text
                    style={[
                      sansation,
                      {
                        marginTop: 3,
                        fontSize: 12,
                        color: palette.inkFaint,
                        includeFontPadding: false,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {t.name}
                  </Text>
                </View>
                <Text
                  style={[
                    serif,
                    {
                      fontSize: 13,
                      color: palette.inkDim,
                      fontStyle: 'italic',
                      flexShrink: 0,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {priceLabel}
                </Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </CenterGlow>
  );
}
