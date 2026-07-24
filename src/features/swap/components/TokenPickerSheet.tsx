/** Token selector bottom sheet for the Swap screen (stub list for now). */
import { Image } from 'expo-image';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sansation } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { SWAP_TOKENS, type SwapToken } from '../lib/tokens';

const S = txPalette('silver');

export function TokenPickerSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (token: SwapToken) => void;
}) {
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
            Select token
          </Text>

          {SWAP_TOKENS.map((tk) => (
            <Pressable
              key={tk.mint}
              onPress={() => {
                onSelect(tk);
                onClose();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}
            >
              <Image
                source={{ uri: tk.logoUri }}
                style={{ width: 38, height: 38, borderRadius: 19 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[sansation, { fontSize: 16, fontWeight: '600', color: S.ink }]}>
                  {tk.symbol}
                </Text>
                <Text style={[sansation, { fontSize: 13, color: S.inkDim, marginTop: 1 }]}>
                  {tk.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
