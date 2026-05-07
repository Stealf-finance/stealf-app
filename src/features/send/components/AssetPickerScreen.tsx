import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/send/hooks/useSolPrice';
import { setSelectedAsset } from '@/src/features/send/lib/selectedAssetStore';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';

const palette = txPalette('silver');

const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  WSOL: 9,
  USDC: 6,
  USDT: 6,
  JUP: 6,
  BONK: 5,
};

const TOKEN_NAMES: Record<string, string> = {
  SOL: 'Solana',
  USDC: 'USD Coin',
  USDT: 'Tether',
  JUP: 'Jupiter',
  BONK: 'Bonk',
};

export function AssetPickerScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // Caller picks which wallet to source tokens from. Defaults to stealth so
  // existing /asset-picker pushes (Shield) keep working unchanged.
  const params = useLocalSearchParams<{ wallet?: 'bank' | 'stealth' }>();
  const sourceAddress =
    params.wallet === 'bank'
      ? user?.bankWallet ?? null
      : user?.stealfWallet ?? null;
  const { data: walletBalance } = useBalance(sourceAddress);
  const { data: solPrice } = useSolPrice();

  const close = () => router.back();

  const tokens = (walletBalance?.tokens ?? []).map((t) => {
    const isSol = t.tokenMint === null || t.tokenSymbol === 'SOL';
    const symbol = t.tokenSymbol;
    const decimals = TOKEN_DECIMALS[symbol] ?? 6;
    const price =
      isSol && typeof solPrice === 'number' && solPrice > 0
        ? solPrice
        : t.balance > 0
          ? t.balanceUSD / t.balance
          : 0;
    return {
      mint: isSol ? SOL_MINT : (t.tokenMint as string),
      symbol,
      name: TOKEN_NAMES[symbol] ?? symbol,
      decimals,
      iconSource: undefined,
      iconUri: isSol ? SOL_ICON_URI : t.tokenIcon ?? undefined,
      balance: t.balance,
      balanceUSD: t.balanceUSD,
      price,
    };
  });

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
        {tokens.length === 0 ? (
          <Text
            style={[
              sansation,
              {
                textAlign: 'center',
                marginTop: 24,
                color: palette.inkFaint,
                fontSize: 13,
              },
            ]}
          >
            No tokens in this wallet yet.
          </Text>
        ) : null}

        {tokens.map((t) => {
          const valueLabel =
            t.balanceUSD > 0
              ? `$${t.balanceUSD.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '—';
          const balanceLabel =
            t.balance > 0
              ? `${t.balance.toFixed(4).replace(/\.?0+$/, '')} ${t.symbol}`
              : `0 ${t.symbol}`;
          return (
            <Pressable
              key={t.mint}
              onPress={() => {
                setSelectedAsset({
                  mint: t.mint,
                  symbol: t.symbol,
                  decimals: t.decimals,
                  iconSource: t.iconSource,
                  iconUri: t.iconUri,
                  balance: t.balance,
                  balanceUSD: t.balanceUSD,
                  price: t.price,
                });
                close();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select ${t.symbol}`}
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
                  source={t.iconUri ? { uri: t.iconUri } : undefined}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  }}
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
                    {balanceLabel}
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
                  {valueLabel}
                </Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </CenterGlow>
  );
}
