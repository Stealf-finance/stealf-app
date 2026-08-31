import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationBold } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

const S = txPalette('silver');

/** A bare header icon — no disc, no border, no blur behind it. */
function IconBtn({
  iconKey,
  onPress,
  label,
  dot,
  children,
}: {
  iconKey: keyof typeof Icons;
  onPress: () => void;
  label: string;
  dot?: boolean;
  children?: ReactNode;
}) {
  const Icon = Icons[iconKey];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 34,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Icon size={20} color={S.ink} />
      {dot ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 6,
            right: 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: S.accent,
          }}
        />
      ) : null}
      {children}
    </Pressable>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 2,
        right: -4,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        borderRadius: 8,
        backgroundColor: S.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={[
          sansationBold,
          { fontSize: 9, color: T.bgLightInk, includeFontPadding: false },
        ]}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

/**
 * The Store's top bar: back, a search field, the filter button and the cart.
 * Every control in the row is a bare glyph — the back chevron included —
 * and the search field is a fill with no outline. Search is controlled by the screen; filtering is local to the
 * loaded catalog, so there is no debounce to worry about.
 */
export function StoreHeader({
  query,
  onQueryChange,
  onBack,
  onFilter,
  onCart,
  cartCount,
  filterActive,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onBack: () => void;
  onFilter: () => void;
  onCart: () => void;
  cartCount: number;
  filterActive: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 20,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Chevron glyph, no backdrop — see BackBtn's `bare`. */}
      <BackBtn onPress={onBack} bare />

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

      <IconBtn
        iconKey="filter"
        onPress={onFilter}
        label="Filter"
        dot={filterActive}
      />

      <IconBtn
        iconKey="cart"
        onPress={onCart}
        label={`Cart, ${cartCount} items`}
      >
        {cartCount > 0 ? <CountBadge count={cartCount} /> : null}
      </IconBtn>
    </View>
  );
}
