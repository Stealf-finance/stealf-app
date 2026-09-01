import { Text, View } from 'react-native';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { StoreSheet } from './StoreSheet';
import { formatMoney } from '../lib/format';
import { shortProductName } from '../lib/productName';
import type { Denomination } from '../lib/denominations';
import type { StoreProduct } from '../api/curated';

const S = txPalette('silver');

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: T.hairline,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <Text style={[sansation, { fontSize: 14, color: S.inkDim }]}>
        {label}
      </Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text
          numberOfLines={1}
          style={[sansation, { fontSize: 15, fontWeight: '600', color: S.ink }]}
        >
          {value}
        </Text>
        {sub ? (
          <Text
            style={[
              sansation,
              { marginTop: 2, fontSize: 12, color: S.inkFaint },
            ]}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Order confirmation, mirroring the send flow's swipe-to-confirm. */
export function BuyConfirmSheet({
  open,
  onClose,
  product,
  amount,
}: {
  open: boolean;
  onClose: () => void;
  product: StoreProduct;
  amount: Denomination;
}) {
  return (
    <StoreSheet open={open} onClose={onClose} title="Confirm your order">
      <Row label="Gift card" value={shortProductName(product.name)} />
      <Row
        label="Card value"
        value={formatMoney(amount.value, product.currency)}
      />
      <Row
        label="You pay"
        value="USDC on Solana"
        sub="Exact amount set when the order is created"
      />

      <Text
        style={[
          sansation,
          {
            marginTop: 16,
            marginBottom: 20,
            fontSize: 12,
            lineHeight: 18,
            color: S.inkFaint,
          },
        ]}
      >
        The redemption code appears here once Bitrefill confirms the payment.
      </Text>

      <SwipeToSend label="Ordering isn't live yet" disabled onSend={() => {}} />
    </StoreSheet>
  );
}
