import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { StoreSheet } from './StoreSheet';
import { BrandMark } from './BrandMark';
import { QtyStepper } from './QtyStepper';
import { lineKey } from '../lib/cart';
import { formatMoney } from '../lib/format';
import type { CartLine } from '../lib/types';

const S = txPalette('silver');

function Row({
  line,
  onQty,
  onRemove,
}: {
  line: CartLine;
  onQty: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: T.hairline,
      }}
    >
      <BrandMark id={line.productId} name={line.name} size={40} radius={12} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={[sansation, { fontSize: 15, fontWeight: '600', color: S.ink }]}
        >
          {line.name}
        </Text>
        <Text style={[sansation, { fontSize: 12, color: S.inkDim, marginTop: 2 }]}>
          {formatMoney(line.value, line.currency)} ·{' '}
          {formatMoney(line.unitPrice * line.quantity, line.currency)}
        </Text>
      </View>

      <QtyStepper quantity={line.quantity} onChange={onQty} size={28} />

      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${line.name}`}
      >
        <Icons.trash size={16} color={S.inkFaint} />
      </Pressable>
    </View>
  );
}

/**
 * The cart. Checkout is deliberately inert in this slice: buying needs the
 * on-chain USDC payment path, and the backend still 503s until Bitrefill is
 * configured. The lines themselves are already in the shape checkout will
 * walk — one `POST /orders` per line.
 */
export function CartSheet({
  open,
  onClose,
  lines,
  total,
  currency,
  onSetQty,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  total: number;
  currency: string;
  onSetQty: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <StoreSheet open={open} onClose={onClose} title="Your cart">
      {lines.length === 0 ? (
        <Text
          style={[
            sansation,
            {
              fontSize: 13,
              color: S.inkFaint,
              paddingVertical: 28,
              textAlign: 'center',
            },
          ]}
        >
          Your cart is empty.
        </Text>
      ) : (
        <>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {lines.map((line) => {
              const key = lineKey(line);
              return (
                <Row
                  key={key}
                  line={line}
                  onQty={(q) => onSetQty(key, q)}
                  onRemove={() => onRemove(key)}
                />
              );
            })}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 18,
            }}
          >
            <Text style={[sansation, { fontSize: 14, color: S.inkDim }]}>Total</Text>
            <Text
              style={[
                sansation,
                { fontSize: 22, fontWeight: '600', color: S.ink, includeFontPadding: false },
              ]}
            >
              {formatMoney(total, currency)}
            </Text>
          </View>

          <PillBtn label="Checkout — coming soon" disabled />
        </>
      )}
    </StoreSheet>
  );
}
