import { Text, View } from 'react-native';
import { SwipeToSend } from '@/src/features/send/components/SwipeToSend';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { StoreSheet } from './StoreSheet';
import { formatMoney } from '../lib/format';
import { shortProductName } from '../lib/productName';
import { useStorePayment } from '../hooks/useStorePayment';
import { orderChargeDisplay } from '../lib/orders';
import { DEV_SOL_TEST_AMOUNT } from '../lib/payment';
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
    order,
    quoting,
    quoteFailed,
    error,
    blockerMessage,
    token,
    isNativeTest,
  } = useStorePayment(product, amount, open);

  const symbol = token?.symbol ?? 'USDC';
  // Bitrefill prices the invoice, so the exact charge only exists once the
  // quote lands. Until then we say so rather than showing a face value the
  // user will not be charged.
  const charged = isNativeTest
    ? `${DEV_SOL_TEST_AMOUNT} ${symbol}`
    : order && token
      ? `${orderChargeDisplay(order).toFixed(2)} ${symbol}`
      : quoting
        ? 'Getting your price…'
        : '—';

  return (
    <StoreSheet open={open} onClose={onClose} title="Confirm your order">
      <Row label="Gift card" value={shortProductName(product.name)} />
      <Row
        label="Card value"
        value={formatMoney(amount.value, product.currency)}
      />
      <Row
        label="You pay"
        value={charged}
        sub={
          isNativeTest
            ? 'Dev test amount in SOL — unrelated to the card price'
            : order
              ? 'From your private balance'
              : quoteFailed
                ? 'Could not reach the price — close and try again'
                : 'Priced by the merchant, not converted by us'
        }
      />

      {signature ? (
        <>
          <Note tone="faint">
            {isNativeTest
              ? 'Dev SOL payment sent. The backend only credits USDC, so this order will never be paid — the transfer is what is being tested.'
              : 'Paid privately. Your card is being purchased — it appears in My Cards once the merchant delivers it.'}
          </Note>
          <View style={{ marginTop: 20 }}>
            <SwipeToSend label="Done" onSend={onClose} />
          </View>
        </>
      ) : (
        <>
          <Note tone="faint">
            Paid confidentially from your private balance. The amount is hidden
            on-chain.
          </Note>
          {error || blockerMessage ? (
            <Note tone="error">{error ?? blockerMessage ?? ''}</Note>
          ) : null}
          <View style={{ marginTop: 20 }}>
            <SwipeToSend
              label={
                sending
                  ? 'Sending…'
                  : quoting
                    ? 'Getting your price…'
                    : 'Swipe to pay'
              }
              disabled={!!blockerMessage || sending || quoting || !order}
              loading={sending || quoting}
              onSend={pay}
            />
          </View>
        </>
      )}
    </StoreSheet>
  );
}
