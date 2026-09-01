import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '@/src/design-system/primitives/ScreenHeader';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationBold } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { CountryPill } from './CountryPill';

const S = txPalette('silver');

const STORE_ICON = require('@/assets/images/store.png');

/** A bare header icon — no disc, no border, no blur behind it. */
function IconBtn({
  iconKey,
  onPress,
  label,
  children,
}: {
  iconKey: keyof typeof Icons;
  onPress: () => void;
  label: string;
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

/** Shared header, then search and cart. Gutter 20 to match the tile grid. */
export function StoreHeader({
  query,
  onQueryChange,
  onBack,
  onCart,
  cartCount,
  market,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onBack: () => void;
  onCart: () => void;
  cartCount: number;
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

        <IconBtn
          iconKey="cart"
          onPress={onCart}
          label={`Cart, ${cartCount} items`}
        >
          {cartCount > 0 ? <CountBadge count={cartCount} /> : null}
        </IconBtn>
      </View>
    </View>
  );
}
