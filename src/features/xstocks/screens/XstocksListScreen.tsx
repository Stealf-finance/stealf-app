/**
 * XstocksListScreen — the curated list of tokenized stocks. Each row taps
 * through to the detail screen.
 */
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useXstocksList } from '../hooks/useXstocksData';
import { XstockRow } from '../components/XstockRow';

const S = txPalette('silver');

export function XstocksListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: assets, isLoading, isError } = useXstocksList();

  return (
    <TonalBackground tone="silver">
      {/* Header row */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[sansation, { fontSize: 15, color: S.inkDim }]}>
            Close
          </Text>
        </TouchableOpacity>
        <Kicker color={T.gold} style={{ letterSpacing: 3.2 }}>
          Stocks
        </Kicker>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            sansationLight,
            {
              fontSize: 28,
              letterSpacing: -0.56,
              color: S.ink,
              marginBottom: 4,
            },
          ]}
        >
          Tokenized stocks
        </Text>
        <Text
          style={[
            sansation,
            { fontSize: 13, color: S.inkDim, marginBottom: 20 },
          ]}
        >
          Buy and sell equities on-chain with USDC.
        </Text>

        {isLoading && (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={S.inkFaint} />
          </View>
        )}

        {isError && !isLoading && (
          <Text
            style={[
              sansation,
              { fontSize: 13, color: T.error, paddingTop: 20 },
            ]}
          >
            Couldn’t load stocks. Pull to retry later.
          </Text>
        )}

        {!isLoading &&
          assets?.map((asset) => (
            <XstockRow
              key={asset.id}
              asset={asset}
              onPress={() => router.push(`/xstocks/${asset.symbol}`)}
            />
          ))}

        {!isLoading && !isError && assets?.length === 0 && (
          <Text
            style={[
              sansation,
              { fontSize: 13, color: S.inkDim, paddingTop: 20 },
            ]}
          >
            No stocks available right now.
          </Text>
        )}
      </ScrollView>
    </TonalBackground>
  );
}
