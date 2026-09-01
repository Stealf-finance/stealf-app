import { Text, View } from 'react-native';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { countryFlag } from '../lib/market';

const S = txPalette('silver');

/** The market the catalog is scoped to. Display only — not a selector yet. */
export function CountryPill({ code }: { code: string | undefined }) {
  if (!code) return <View style={{ width: 36 }} />;
  const flag = countryFlag(code);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Market: ${code}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 32,
        paddingHorizontal: 10,
        borderRadius: 100,
        backgroundColor: T.bgCard,
        borderWidth: 1,
        borderColor: T.hairline,
      }}
    >
      {flag ? <Text style={{ fontSize: 15 }}>{flag}</Text> : null}
      <Text
        style={[
          sansation,
          {
            fontSize: 13,
            fontWeight: '600',
            color: S.ink,
            includeFontPadding: false,
          },
        ]}
      >
        {code}
      </Text>
    </View>
  );
}
