import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/design-system/primitives/ScreenHeader';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useToast } from '@/src/components/toast/ToastContext';
import { BrandMark } from '../components/BrandMark';
import { QtyStepper } from '../components/QtyStepper';
import { useCart } from '../context/CartContext';
import { useCuratedProducts } from '../hooks/useCuratedProducts';
import { findProduct } from '../lib/catalog';
import { formatMoney, packageValue, unitPriceOf } from '../lib/format';
import { resolveDetailState } from '../lib/listState';
import { rangeAmountError } from '../lib/range';
import { GROUP_LABELS } from '../lib/types';

const S = txPalette('silver');

const DETAIL_NOTICE = {
  skeleton: 'Loading…',
  unavailable: "Gift cards aren't live yet.",
  error: "Couldn't load this gift card.",
  missing: 'This gift card is no longer available.',
  groups: '',
} as const;

function Label({ children }: { children: string }) {
  return (
    <Text
      style={[
        sansation,
        {
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: S.inkFaint,
          marginBottom: 12,
        },
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * A gift card's detail: pick a denomination and a quantity, add it to the
 * cart. Two product shapes — fixed `packages` become selectable pills, an
 * open `range` becomes a bounded amount field (see ../lib/range).
 *
 * Nothing is bought here: the CTA fills the local cart, whose checkout is
 * inert until the payment path lands.
 */
export function GiftCardDetailScreen({ productId }: { productId: string }) {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const cart = useCart();

  const { data: groups, error } = useCuratedProducts();

  const [selectedPackageId, setSelectedPackageId] = useState<string>();
  // null until the user types, so a product arriving late still seeds the min.
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const product = useMemo(
    () => findProduct(groups, productId),
    [groups, productId],
  );
  const state = resolveDetailState(groups, error, product !== undefined);

  if (state !== 'groups' || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <ScreenHeader title="Gift card" onBack={() => router.back()} />
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

  const ranged = product.packages.length === 0 && product.range != null;
  const selectedPackage =
    product.packages.find((p) => p.packageId === selectedPackageId) ??
    product.packages[0];

  const amountText = typedAmount ?? String(product.range?.min ?? '');
  const amount = Number(amountText.replace(',', '.'));
  const rangeError = ranged
    ? rangeAmountError(amount, product.range ?? {}, product.currency)
    : null;

  const value = ranged ? amount : packageValue(selectedPackage);
  const unitPrice = ranged ? amount : unitPriceOf(selectedPackage);
  const canAdd = product.inStock && rangeError === null && value > 0;

  const addToCart = () => {
    cart.add({
      productId: product.id,
      name: product.name,
      currency: product.currency ?? '',
      packageId: ranged ? undefined : selectedPackage?.packageId,
      value,
      unitPrice,
      quantity,
    });
    toast.show({
      kind: 'success',
      title: 'Added to cart',
      message: `${quantity} × ${product.name} ${formatMoney(value, product.currency)}`,
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader
        title={product.name}
        onBack={() => router.back()}
        adjustFontSize
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 140,
        }}
      >
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <BrandMark
            id={product.id}
            name={product.name}
            uri={product.image}
            size={104}
            radius={28}
          />
          <Text
            style={[
              sansation,
              { marginTop: 14, fontSize: 13, color: S.inkDim },
            ]}
          >
            {GROUP_LABELS[product.group]}
            {product.country ? ` · ${product.country}` : ''}
          </Text>
        </View>

        {!product.inStock ? (
          <Text
            style={[
              sansation,
              {
                fontSize: 13,
                color: T.error,
                textAlign: 'center',
                marginBottom: 24,
              },
            ]}
          >
            This card is out of stock right now.
          </Text>
        ) : null}

        <Label>{ranged ? 'Amount' : 'Denomination'}</Label>

        {ranged ? (
          <View style={{ marginBottom: 28 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 18,
                height: 58,
                borderRadius: 18,
                backgroundColor: T.bgCard,
                borderWidth: 1,
                borderColor: rangeError ? T.error : T.hairline,
              }}
            >
              <TextInput
                value={amountText}
                onChangeText={setTypedAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={S.inkFaint}
                accessibilityLabel="Amount"
                style={[
                  sansation,
                  {
                    flex: 1,
                    fontSize: 22,
                    fontWeight: '600',
                    color: S.ink,
                    padding: 0,
                  },
                ]}
              />
              <Text style={[sansation, { fontSize: 16, color: S.inkDim }]}>
                {product.currency}
              </Text>
            </View>
            <Text
              style={[
                sansation,
                {
                  marginTop: 8,
                  fontSize: 12,
                  color: rangeError ? T.error : S.inkFaint,
                },
              ]}
            >
              {rangeError ??
                `${formatMoney(product.range?.min ?? 0, product.currency)} – ${formatMoney(
                  product.range?.max ?? 0,
                  product.currency,
                )}`}
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 28,
            }}
          >
            {product.packages.map((pkg) => {
              const active = pkg.packageId === selectedPackage?.packageId;
              return (
                <Pressable
                  key={pkg.packageId}
                  onPress={() => setSelectedPackageId(pkg.packageId)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={formatMoney(
                    packageValue(pkg),
                    product.currency,
                  )}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 22,
                    borderRadius: 16,
                    backgroundColor: active ? S.accentSoft : T.bgCard,
                    borderWidth: 1,
                    borderColor: active ? T.hairlineStrong : T.hairline,
                  }}
                >
                  <Text
                    style={[
                      sansation,
                      {
                        fontSize: 16,
                        fontWeight: active ? '700' : '500',
                        color: active ? S.ink : S.inkDim,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    {formatMoney(packageValue(pkg), product.currency)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Label>Quantity</Label>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 6,
          }}
        >
          <QtyStepper quantity={quantity} onChange={setQuantity} size={34} />
          <Text
            style={[
              sansation,
              {
                fontSize: 22,
                fontWeight: '600',
                color: S.ink,
                includeFontPadding: false,
              },
            ]}
          >
            {formatMoney(unitPrice * quantity, product.currency)}
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: insets.bottom + 16,
        }}
      >
        <PillBtn label="Add to cart" onPress={addToCart} disabled={!canAdd} />
      </View>
    </View>
  );
}
