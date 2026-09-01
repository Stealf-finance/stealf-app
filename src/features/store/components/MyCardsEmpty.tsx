import { Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

const S = txPalette('silver');

/**
 * My Cards, before there is anything to show. Purchased cards will come from
 * `GET /api/giftcards/orders`; nothing here calls it yet.
 */
export function MyCardsEmpty() {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: T.bgCard,
          borderWidth: 1,
          borderColor: T.hairline,
        }}
      >
        <Icons.gift size={26} color={S.inkDim} />
      </View>

      <Text
        style={[
          sansation,
          {
            marginTop: 20,
            fontSize: 17,
            fontWeight: '600',
            color: S.ink,
            includeFontPadding: false,
          },
        ]}
      >
        No gift cards yet
      </Text>

      <Text
        style={[
          sansation,
          {
            marginTop: 8,
            fontSize: 13,
            lineHeight: 19,
            color: S.inkDim,
            textAlign: 'center',
          },
        ]}
      >
        Cards you buy will appear here with their redemption code.
      </Text>
    </View>
  );
}
