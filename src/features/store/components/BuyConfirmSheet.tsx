import { Text, View } from 'react-native';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { StoreSheet } from './StoreSheet';
import { formatMoney } from '../lib/format';
import { shortProductName } from '../lib/productName';
import { useStorePayment } from '../hooks/useStorePayment';
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

function Note({
  tone,
  children,
}: {
  tone: 'faint' | 'error';
  children: string;
}) {
  return (
    <Text
      style={[
        sansation,
        {
          marginTop: 16,
          fontSize: 12,
          lineHeight: 18,
          color: tone === 'error' ? T.error : S.inkFaint,
        },
      ]}
    >
      {children}
    </Text>
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
  const {
    pay,
    sending,
    signature,
    error,
    blockerMessage,
    token,
    humanAmount,
    isNativeTest,
  } = useStorePayment(product, amount);

  const symbol = token?.symbol ?? 'USDC';
  const charged = humanAmount ?? amount.unitPrice;

  return (
    <StoreSheet open={open} onClose={onClose} title="Confirm your order">
      <Row label="Gift card" value={shortProductName(product.name)} />
      <Row
        label="Card value"
        value={formatMoney(amount.value, product.currency)}
      />
      <Row
        label="You pay"
        value={`${charged} ${symbol}`}
        sub={
          isNativeTest
            ? 'Dev test amount in SOL — unrelated to the card price'
            : product.currency && product.currency !== 'USD'
              ? `Charged 1:1 against the ${product.currency} face value`
              : 'From your encrypted balance'
        }
      />

      {signature ? (
        <>
          <Note tone="faint">
            Payment sent privately to Stealf. No card is ordered yet — order
            fulfilment is not wired.
          </Note>
          <View style={{ marginTop: 20 }}>
            <SwipeToSend label="Done" onSend={onClose} />
          </View>
        </>
      ) : (
        <>
          <Note tone="faint">
            Pays Stealf directly from your encrypted balance. Nothing is ordered
            from Bitrefill yet.
          </Note>
          {error || blockerMessage ? (
            <Note tone="error">{error ?? blockerMessage ?? ''}</Note>
          ) : null}
          <View style={{ marginTop: 20 }}>
            <SwipeToSend
              label={sending ? 'Sending…' : 'Swipe to pay'}
              disabled={!!blockerMessage || sending}
              loading={sending}
              onSend={pay}
            />
          </View>
        </>
      )}
    </StoreSheet>
  );
}
