import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { GlassListRow } from '@/src/features/receive/components/GlassListRow';

// Stub picker: today only SOL is selectable. Mainnet rollout will widen
// this list and propagate the choice back to the calling Move/Shield flow.
export function AssetPickerScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();

  const close = () => router.back();

  return (
    <CenterGlow tone="silver" flat>
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <BackBtn onPress={close} />
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
              marginRight: 36,
            },
          ]}
        >
          Select asset
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>
            Available
          </Kicker>
          <GlassListRow
            leading={<TokenDisc source={require('@/assets/images/solana-icon.png')} />}
            label="Solana"
            sub="SOL"
            onPress={close}
            trailing={<Icons.check size={14} color={T.ink} />}
            accessibilityLabel="Solana selected"
          />
        </View>

        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>
            Coming soon
          </Kicker>
          <GlassListRow
            leading={<TokenDisc source={require('@/assets/images/usdc.png')} />}
            label="USDC"
            sub="More tokens at mainnet launch"
            disabled
          />
        </View>
      </ScrollView>
    </CenterGlow>
  );
}

function TokenDisc({ source }: { source: number }) {
  return (
    <Image
      source={source}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0a0a0a',
      }}
    />
  );
}
