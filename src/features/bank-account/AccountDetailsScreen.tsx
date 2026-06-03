import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import { serif, sansation, mono } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useToast } from '@/src/components/toast/ToastContext';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';

export function AccountDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { show } = useToast();
  const { user } = useAuth();
  const address = user?.bankWallet ?? '';

  const copy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    show({
      kind: 'success',
      title: 'Copied',
      message: 'Bank wallet address copied.',
    });
  };

  return (
    <CenterGlow tone="silver" flat>
      <View
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackBtn onPress={() => router.back()} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 32,
              fontStyle: 'italic',
              color: T.ink,
              includeFontPadding: false,
            },
          ]}
        >
          Account details
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 8,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          accessibilityLabel="Copy bank wallet address"
          style={({ pressed }) => ({
            borderRadius: 18,
            borderWidth: 1,
            borderColor: T.hairline,
            backgroundColor: 'rgba(255,255,255,0.03)',
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                sansation,
                {
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  color: T.inkFaint,
                  fontWeight: '700',
                },
              ]}
            >
              Bank wallet address
            </Text>
            <Text
              style={[
                mono,
                { fontSize: 14, color: T.ink, marginTop: 6, lineHeight: 20 },
              ]}
            >
              {address || '—'}
            </Text>
          </View>
          <Icons.copy size={16} color={T.inkFaint} />
        </Pressable>
      </ScrollView>
    </CenterGlow>
  );
}
