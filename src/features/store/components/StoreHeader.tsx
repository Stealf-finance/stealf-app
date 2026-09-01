import { Pressable, TextInput, View } from 'react-native';
import { ScreenHeader } from '@/src/design-system/primitives/ScreenHeader';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { CountryPill } from './CountryPill';

const S = txPalette('silver');

const STORE_ICON = require('@/assets/images/store.png');

/** Shared header, then the search field. Gutter 20 to match the tile grid. */
export function StoreHeader({
  query,
  onQueryChange,
  onBack,
  market,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onBack: () => void;
  market: string | undefined;
}) {
  return (
    <View>
      <ScreenHeader
        title="Gift Cards"
        icon={STORE_ICON}
        onBack={onBack}
        right={<CountryPill code={market} />}
        top="hero"
        gutter={20}
        style={{ paddingBottom: 4 }}
      />

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: 100,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: T.bgCard,
          }}
        >
          <Icons.search size={16} color={S.inkFaint} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search"
            placeholderTextColor={S.inkFaint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search gift cards"
            style={[
              sansation,
              { flex: 1, fontSize: 14, color: S.ink, padding: 0 },
            ]}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => onQueryChange('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icons.close size={15} color={S.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
