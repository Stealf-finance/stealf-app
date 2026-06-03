import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import { serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { GlassTile } from '@/src/features/receive/components/GlassTile';
import {
  BankDisc,
  StealfDisc,
  UsdcDisc,
} from '@/src/features/receive/components/Discs';

export function ReceiveMenu() {
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
          Receive money
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <GlassTile
            leading={<IncomingDisc />}
            label="Incoming private transfers"
            onPress={() => router.push('/claims')}
            accessibilityLabel="Open incoming private transfers"
            trailing={<Icons.chevR size={14} color={T.inkFaint} />}
          />
          <GlassTile
            leading={<UsdcDisc />}
            label="USDC on Solana"
            onPress={() => router.push('/receive/flow?tone=silver&wallet=bank')}
            trailing={<Icons.chevR size={14} color={T.inkFaint} />}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 14 }}>
          <GlassTile
            leading={<StealfDisc />}
            label="Stealf user"
            disabled
          />
          <GlassTile
            leading={<BankDisc />}
            label="Bank transfer"
            disabled
          />
        </View>
      </ScrollView>
    </CenterGlow>
  );
}

function IncomingDisc() {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(230,192,121,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(230,192,121,0.16)', 'rgba(163,123,46,0.04)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Icons.gift size={16} color="#e6c079" strokeWidth={1.6} />
    </View>
  );
}

