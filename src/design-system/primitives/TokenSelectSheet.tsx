/**
 * Global token/asset selector — a bottom sheet listing tokens (logo + symbol +
 * name, optional balance / value on the right). Generic over the item type: the
 * caller maps each item to a display row and gets the full item back on select.
 * Used by the Swap screen (static list) and the Send / Shield / Move flows
 * (wallet balances).
 */
import { Image, type ImageSource } from 'expo-image';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';

const S = txPalette('silver');

export type TokenRow = {
  symbol: string;
  name: string;
  iconUri?: string;
  iconSource?: ImageSource | number;
  /** e.g. "3.8916 SOL" — right column, top line. */
  balanceLabel?: string;
  /** e.g. "$12.34" — right column, bottom line. */
  valueLabel?: string;
};

type Props<T> = {
  open: boolean;
  onClose: () => void;
  items: T[];
  keyOf: (item: T) => string;
  toRow: (item: T) => TokenRow;
  onSelect: (item: T) => void;
  title?: string;
  emptyLabel?: string;
};

export function TokenSelectSheet<T>({
  open,
  onClose,
  items,
  keyOf,
  toRow,
  onSelect,
  title = 'Select token',
  emptyLabel = 'No tokens available.',
}: Props<T>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent visible={open} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
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
            paddingBottom: insets.bottom + 24,
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
            {title}
          </Text>

          {items.length === 0 ? (
            <Text style={[sansation, { fontSize: 13, color: S.inkFaint, paddingVertical: 20, textAlign: 'center' }]}>
              {emptyLabel}
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {items.map((item) => {
                const row = toRow(item);
                return (
                  <Pressable
                    key={keyOf(item)}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}
                  >
                    {row.iconUri || row.iconSource ? (
                      <Image
                        source={row.iconSource ?? { uri: row.iconUri }}
                        style={{ width: 38, height: 38, borderRadius: 19 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: 'rgba(255,255,255,0.06)',
                        }}
                      />
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[sansation, { fontSize: 16, fontWeight: '600', color: S.ink }]}>
                        {row.symbol}
                      </Text>
                      <Text style={[sansation, { fontSize: 13, color: S.inkDim, marginTop: 1 }]}>
                        {row.name}
                      </Text>
                    </View>
                    {row.balanceLabel || row.valueLabel ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        {row.balanceLabel ? (
                          <Text style={[sansation, { fontSize: 15, fontWeight: '500', color: S.ink }]}>
                            {row.balanceLabel}
                          </Text>
                        ) : null}
                        {row.valueLabel ? (
                          <Text style={[sansation, { fontSize: 12, color: S.inkFaint, marginTop: 2 }]}>
                            {row.valueLabel}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
