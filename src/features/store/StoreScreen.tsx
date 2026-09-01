import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { StoreHeader } from './components/StoreHeader';
import { StoreSegments, type StoreTab } from './components/StoreSegments';
import { CategorySection } from './components/CategorySection';
import { MyCardsEmpty } from './components/MyCardsEmpty';
import {
  StoreError,
  StoreSkeleton,
  StoreUnavailable,
} from './components/StoreStates';
import { useCuratedProducts } from './hooks/useCuratedProducts';
import { flattenGroups, searchCatalog } from './lib/catalog';
import { resolveStoreState } from './lib/listState';
import { dominantCountry } from './lib/market';
import type { StoreProduct } from './api/curated';

const S = txPalette('silver');

function EmptyResults({ query }: { query: string }) {
  return (
    <View
      style={{ paddingHorizontal: 40, paddingTop: 60, alignItems: 'center' }}
    >
      <Text
        style={[
          sansation,
          {
            fontSize: 16,
            fontWeight: '600',
            color: S.ink,
            includeFontPadding: false,
          },
        ]}
      >
        Nothing matches
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
        {query.trim()
          ? `No gift card named “${query.trim()}”.`
          : 'The catalogue is empty right now.'}
      </Text>
    </View>
  );
}

export function StoreScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { data: groups, error } = useCuratedProducts();

  const [tab, setTab] = useState<StoreTab>('buy');
  const [query, setQuery] = useState('');

  const state = resolveStoreState(groups, error);
  const searching = query.trim().length > 0;

  const sections = useMemo(() => groups ?? [], [groups]);

  const results = useMemo(
    () => searchCatalog(flattenGroups(sections), query),
    [sections, query],
  );

  // The products disagree on country (IE/EU/GB), so the market is the mode.
  const market = useMemo(
    () => dominantCountry(flattenGroups(groups)),
    [groups],
  );

  const openProduct = (product: StoreProduct) =>
    router.push(`/store/${product.id}`);

  const renderBuy = () => {
    if (state === 'skeleton') return <StoreSkeleton />;
    if (state === 'unavailable') return <StoreUnavailable />;
    if (state === 'error') return <StoreError />;
    if (results.length === 0) return <EmptyResults query={query} />;
    if (searching) {
      return (
        <CategorySection
          title="Results"
          products={results}
          onSelect={openProduct}
        />
      );
    }
    return sections.map((section) => (
      <CategorySection
        key={section.group}
        group={section.group}
        products={section.products}
        onSelect={openProduct}
      />
    ));
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StoreHeader
        query={query}
        onQueryChange={setQuery}
        onBack={() => router.back()}
        market={market}
      />

      <StoreSegments value={tab} onChange={setTab} />

      {tab === 'buy' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {renderBuy()}
        </ScrollView>
      ) : (
        <MyCardsEmpty />
      )}
    </View>
  );
}
