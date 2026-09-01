import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { StoreHeader } from './components/StoreHeader';
import { StoreSegments, type StoreTab } from './components/StoreSegments';
import { BestSellingRail } from './components/BestSellingRail';
import { CategorySection } from './components/CategorySection';
import { FilterSheet } from './components/FilterSheet';
import { CartSheet } from './components/CartSheet';
import { MyCardsEmpty } from './components/MyCardsEmpty';
import { useCart } from './context/CartContext';
import {
  CATEGORY_ORDER,
  STORE_CATALOG,
  filterByCategories,
  groupByCategory,
  searchCatalog,
} from './lib/catalog';
import { resolveFeatured } from './lib/featured';
import type { StoreCategory, StoreProduct } from './lib/types';

const S = txPalette('silver');

/** Categories the loaded catalog actually contains, in display order — so the
 *  filter never offers a category that would return nothing. */
const AVAILABLE_CATEGORIES: StoreCategory[] = CATEGORY_ORDER.filter((c) =>
  STORE_CATALOG.some((p) => p.category === c),
);

function EmptyResults({ query }: { query: string }) {
  return (
    <View style={{ paddingHorizontal: 40, paddingTop: 60, alignItems: 'center' }}>
      <Text
        style={[
          sansation,
          { fontSize: 16, fontWeight: '600', color: S.ink, includeFontPadding: false },
        ]}
      >
        Nothing matches
      </Text>
      <Text
        style={[
          sansation,
          { marginTop: 8, fontSize: 13, lineHeight: 19, color: S.inkDim, textAlign: 'center' },
        ]}
      >
        {query.trim()
          ? `No gift card named “${query.trim()}”.`
          : 'No gift card fits these filters.'}
      </Text>
    </View>
  );
}

/**
 * The Store catalog. Everything on this screen reads the static catalog in
 * `lib/catalog` — no network call, by design: the gift-card routes 503 until
 * Bitrefill is configured, and the data layer is a later slice. Search and
 * filtering are local, which is also how they should work once the catalog is
 * fetched: it arrives whole (Bitrefill caps a page at 50) and is cached.
 */
export function StoreScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const cart = useCart();

  const [tab, setTab] = useState<StoreTab>('buy');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    const byCategory = filterByCategories(STORE_CATALOG, categories);
    const byStock = inStockOnly ? byCategory.filter((p) => p.inStock) : byCategory;
    return searchCatalog(byStock, query);
  }, [categories, inStockOnly, query]);

  const featured = useMemo(() => resolveFeatured(visible), [visible]);
  const sections = useMemo(() => groupByCategory(visible), [visible]);

  const openProduct = (product: StoreProduct) =>
    router.push(`/store/${product.id}`);

  const toggleCategory = (category: StoreCategory) =>
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );

  const resetFilters = () => {
    setCategories([]);
    setInStockOnly(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StoreHeader
        query={query}
        onQueryChange={setQuery}
        onBack={() => router.back()}
        onFilter={() => setFilterOpen(true)}
        onCart={() => setCartOpen(true)}
        cartCount={cart.count}
        filterActive={categories.length > 0 || inStockOnly}
      />

      <StoreSegments value={tab} onChange={setTab} />

      {tab === 'buy' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {visible.length === 0 ? (
            <EmptyResults query={query} />
          ) : searching ? (
            <CategorySection title="Results" products={visible} onSelect={openProduct} />
          ) : (
            <>
              <BestSellingRail products={featured} onSelect={openProduct} />
              {sections.map((section) => (
                <CategorySection
                  key={section.category}
                  category={section.category}
                  products={section.products}
                  onSelect={openProduct}
                />
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <MyCardsEmpty />
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={AVAILABLE_CATEGORIES}
        selected={categories}
        onToggle={toggleCategory}
        inStockOnly={inStockOnly}
        onToggleInStock={() => setInStockOnly((v) => !v)}
        onReset={resetFilters}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cart.lines}
        total={cart.total}
        currency={cart.currency}
        onSetQty={cart.setQty}
        onRemove={cart.remove}
      />
    </View>
  );
}
