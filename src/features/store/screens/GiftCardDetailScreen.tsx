import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackButton } from '@/src/design-system/primitives/GlassBackButton';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useToast } from '@/src/components/toast/ToastContext';
import { AmountSlider } from '../components/AmountSlider';
import { BrandArt } from '../components/BrandArt';
import { FavoriteBtn } from '../components/FavoriteBtn';
import { useCart } from '../context/CartContext';
import { useCuratedProducts } from '../hooks/useCuratedProducts';
import { findProduct } from '../lib/catalog';
import { clampIndex, denominations } from '../lib/denominations';
import { formatMoney } from '../lib/format';
import { GRID_GUTTER } from '../lib/grid';
import { resolveDetailState } from '../lib/listState';
import { shortProductName } from '../lib/productName';

const S = txPalette('silver');

const DETAIL_NOTICE = {
  skeleton: 'Loading…',
  unavailable: "Gift cards aren't live yet.",
  error: "Couldn't load this gift card.",
  missing: 'This gift card is no longer available.',
  groups: '',
} as const;

function StepBtn({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: 'minus' | 'plus';
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  const Icon = Icons[icon];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: T.hairlineStrong,
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
      })}
    >
      <Icon size={18} color={S.ink} />
    </Pressable>
  );
}

export function GiftCardDetailScreen({ productId }: { productId: string }) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { width: screen } = useWindowDimensions();
  const toast = useToast();
  const cart = useCart();
  const { data: groups, error } = useCuratedProducts();

  const [index, setIndex] = useState(0);

  const product = useMemo(
    () => findProduct(groups, productId),
    [groups, productId],
  );
  const state = resolveDetailState(groups, error, product !== undefined);

  const options = useMemo(
    () => (product ? denominations(product) : []),
    [product],
  );

  if (state !== 'groups' || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
          <GlassBackButton onPress={() => router.back()} />
        </View>
        <Text
          style={[
            sansation,
            {
              fontSize: 14,
              color: S.inkDim,
              textAlign: 'center',
              marginTop: 40,
            },
          ]}
        >
          {DETAIL_NOTICE[state]}
        </Text>
      </View>
    );
  }

  const selected = options[clampIndex(index, options.length)];
  const canAdd = product.inStock && selected !== undefined;
  const contentWidth = screen - GRID_GUTTER * 2;

  const addToCart = () => {
    if (!selected) return;
    cart.add({
      productId: product.id,
      name: product.name,
      currency: product.currency ?? '',
      packageId: selected.packageId,
      value: selected.value,
      unitPrice: selected.unitPrice,
      quantity: 1,
    });
    toast.show({
      kind: 'success',
      title: 'Added to cart',
      message: `${shortProductName(product.name)} ${formatMoney(selected.value, product.currency)}`,
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: GRID_GUTTER,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <GlassBackButton onPress={() => router.back()} />
        <FavoriteBtn productId={product.id} name={product.name} size={22} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GRID_GUTTER,
          paddingBottom: insets.bottom + 140,
        }}
      >
        <BrandArt id={product.id} name={product.name} width={contentWidth} />

        <Text
          style={[
            sansation,
            {
              marginTop: 16,
              fontSize: 20,
              fontWeight: '600',
              color: S.ink,
              includeFontPadding: false,
            },
          ]}
        >
          {shortProductName(product.name)}
        </Text>

        {!product.inStock ? (
          <Text
            style={[sansation, { marginTop: 8, fontSize: 13, color: T.error }]}
          >
            This card is out of stock right now.
          </Text>
        ) : null}

        <Text
          style={[
            sansation,
            {
              marginTop: 32,
              fontSize: 13,
              color: S.inkDim,
              textAlign: 'center',
            },
          ]}
        >
          Select amount
        </Text>

        <View
          style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
          }}
        >
          <StepBtn
            icon="minus"
            onPress={() => setIndex((i) => clampIndex(i - 1, options.length))}
            disabled={index <= 0}
            label="Lower amount"
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 42,
                lineHeight: 50,
                fontWeight: '600',
                letterSpacing: -1,
                color: S.ink,
                includeFontPadding: false,
              },
            ]}
          >
            {selected ? formatMoney(selected.value, product.currency) : '—'}
          </Text>
          <StepBtn
            icon="plus"
            onPress={() => setIndex((i) => clampIndex(i + 1, options.length))}
            disabled={index >= options.length - 1}
            label="Raise amount"
          />
        </View>

        {options.length > 1 ? (
          <View style={{ marginTop: 28 }}>
            <AmountSlider
              count={options.length}
              index={clampIndex(index, options.length)}
              onChange={setIndex}
            />
            <View
              style={{
                marginTop: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={[sansation, { fontSize: 12, color: S.inkFaint }]}>
                {formatMoney(options[0].value, product.currency)}
              </Text>
              <Text style={[sansation, { fontSize: 12, color: S.inkFaint }]}>
                {formatMoney(
                  options[options.length - 1].value,
                  product.currency,
                )}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: GRID_GUTTER,
          right: GRID_GUTTER,
          bottom: insets.bottom + 16,
        }}
      >
        <PillBtn label="Add to cart" onPress={addToCart} disabled={!canAdd} />
      </View>
    </View>
  );
}
