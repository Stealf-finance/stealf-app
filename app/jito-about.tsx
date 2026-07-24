import { Linking, Pressable, Text } from 'react-native';
import { SheetShell } from '@/src/design-system/primitives/SheetShell';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

const S = txPalette('silver');

const LEARN_MORE_URL =
  'https://www.jito.network/docs/jitosol/jitosol-liquid-staking/liquid-staking-basics/';

const ABOUT_TEXT =
  'JitoSOL is a liquid staking token from the Jito stake pool. Stake SOL to ' +
  'receive JitoSOL, which accrues staking rewards plus MEV each epoch — so its ' +
  'value in SOL grows over time. It stays liquid, so you can move or withdraw ' +
  'it whenever you want.';

/** About jitoSOL — opened from the "?" on the JitoSOL product screen. */
export default function JitoAbout() {
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
        About jitoSOL
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
