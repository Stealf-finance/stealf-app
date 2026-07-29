/** Swap confirmation sheet — quote summary + Swap button (runs the execute). */
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import type { SwapToken } from '../lib/tokens';

const S = txPalette('silver');

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
      <Text style={[sansation, { fontSize: 14, color: S.inkDim }]}>{label}</Text>
      <Text style={[sansation, { fontSize: 14, fontWeight: '600', color: S.ink }]}>{value}</Text>
    </View>
  );
}

const fmt = (n: number, max = 6) =>
  n.toLocaleString('en-US', { maximumFractionDigits: max });

export function SwapReviewSheet({
  open,
  onClose,
  payToken,
  receiveToken,
  payAmount,
  receiveAmount,
  priceImpact,
  loading,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  payToken: SwapToken;
  receiveToken: SwapToken;
  payAmount: number;
  receiveAmount: number;
  priceImpact?: number;
  loading: boolean;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const rate = payAmount > 0 ? receiveAmount / payAmount : 0;

  return (
    <Modal transparent visible={open} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={loading ? undefined : onClose}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: '#0d0d0d',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: T.hairline,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: T.hairlineStrong,
              marginBottom: 22,
            }}
          />
          <Text
            style={[sansation, { fontSize: 20, lineHeight: 26, fontWeight: '600', color: T.ink, marginBottom: 8 }]}
          >
            Review swap
          </Text>

          <Row label="You pay" value={`${fmt(payAmount)} ${payToken.symbol}`} />
          <Row label="You receive" value={`≈ ${fmt(receiveAmount)} ${receiveToken.symbol}`} />
          <Row
            label="Rate"
            value={`1 ${payToken.symbol} ≈ ${fmt(rate)} ${receiveToken.symbol}`}
          />
          {priceImpact != null ? (
            <Row label="Price impact" value={`${(priceImpact * 100).toFixed(2)}%`} />
          ) : null}

          <View style={{ marginTop: 18 }}>
            <PillBtn
              label={loading ? 'Swapping…' : 'Swap'}
              variant="primary"
              tone="silver"
              disabled={loading}
              onPress={onConfirm}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
