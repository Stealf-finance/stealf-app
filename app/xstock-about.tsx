import { Linking, Pressable, Text } from 'react-native';
import { SheetShell } from '@/src/design-system/primitives/SheetShell';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

const S = txPalette('silver');

const LEARN_MORE_URL = 'https://xstocks.com';

const ABOUT_TEXT =
  'xStocks are tokenized US equities on Solana — each token tracks a real ' +
  'share and trades 24/7 through Jupiter. Buy or sell fractional amounts with ' +
  'USDC straight from your wallet; the price you get is the live on-chain swap ' +
  'rate, and the reference price shown is indicative.';

/** About xStocks — opened from the "?" on an xStock detail screen. */
export default function XstockAbout() {
  const router = useSafeRouter();
  const close = () => router.back();

  return (
    <SheetShell onClose={close}>
      <Text
        style={[
          sansation,
          { fontSize: 20, lineHeight: 26, fontWeight: '600', color: T.ink, marginBottom: 12 },
        ]}
      >
        About xStocks
      </Text>
      <Text style={[sansation, { fontSize: 14, lineHeight: 21, color: S.inkDim }]}>
        {ABOUT_TEXT}
      </Text>

      <Pressable
        onPress={() => void Linking.openURL(LEARN_MORE_URL)}
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 20,
          height: 40,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <Icons.globe size={16} color={S.ink} />
        <Text style={[sansation, { fontSize: 14, fontWeight: '600', color: S.ink }]}>
          Learn more
        </Text>
      </Pressable>
    </SheetShell>
  );
}
