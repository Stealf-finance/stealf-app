import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

/**
 * The Store's bottom-sheet shell — the in-screen `Modal` form the app already
 * uses for TokenSelectSheet, rather than the route-based `SheetShell`: the
 * filter and cart are screen state, not destinations.
 */
export function StoreSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
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
            style={[
              sansation,
              {
                fontSize: 20,
                lineHeight: 26,
                fontWeight: '600',
                color: T.ink,
                marginBottom: 12,
              },
            ]}
          >
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
