import { Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { GiftCardTileSkeleton } from './GiftCardTile';
import { GRID_GAP, GRID_GUTTER } from '../lib/grid';

const S = txPalette('silver');

function Notice({
  icon,
  title,
  body,
}: {
  icon: 'gift' | 'info';
  title: string;
  body: string;
}) {
  const Icon = icon === 'gift' ? Icons.gift : Icons.info;
  return (
    <View
      style={{ alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 }}
    >
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
        <Icon size={26} color={S.inkDim} />
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
        {title}
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
        {body}
      </Text>
    </View>
  );
}

/** Two sections of four tiles — the shape a loaded catalog settles into. */
export function StoreSkeleton() {
  return (
    <View>
      {[0, 1].map((section) => (
        <View
          key={section}
          style={{ marginBottom: 28, paddingHorizontal: GRID_GUTTER }}
        >
          <View
            style={{
              width: 120,
              height: 20,
              borderRadius: 6,
              backgroundColor: T.bgCard,
              marginBottom: 12,
            }}
          />
          <View style={{ gap: 20 }}>
            {[0, 1].map((row) => (
              <View key={row} style={{ flexDirection: 'row', gap: GRID_GAP }}>
                <GiftCardTileSkeleton />
                <GiftCardTileSkeleton />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** HTTP 503 — the backend has no Bitrefill credentials yet. */
export function StoreUnavailable() {
  return (
    <Notice
      icon="gift"
      title="Gift cards aren't live yet"
      body="This is coming soon. Nothing is wrong with your account."
    />
  );
}

export function StoreError() {
  return (
    <Notice
      icon="info"
      title="Couldn't load the store"
      body="Check your connection and try again."
    />
  );
}
