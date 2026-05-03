import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationBold,
  serif,
} from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { GlassListRow } from '@/src/features/receive/components/GlassListRow';
import {
  StealfDisc,
  UsdcDisc,
  UsdFlagDisc,
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
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>
            Pending claims
          </Kicker>
          <GlassListRow
            leading={<IncomingDisc />}
            label="Pending claims"
            sub="Tap to review incoming transfers"
            onPress={() => router.push('/receive/claims')}
            accessibilityLabel="Open pending claims"
            trailing={<Icons.chevR size={14} color={T.inkFaint} />}
          />
        </View>

        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>
            Receive by address
          </Kicker>
          <GlassListRow
            leading={<UsdcDisc />}
            label="USDC"
            sub={
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 11,
                    color: T.inkFaint,
                    includeFontPadding: false,
                  },
                ]}
              >
                on{' '}
                <Text style={[sansationBold, { color: T.ink }]}>Solana</Text>
              </Text>
            }
            onPress={() => router.push('/receive/flow?tone=silver&wallet=bank')}
          />
        </View>

        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>Stealf</Kicker>
          <GlassListRow
            leading={<StealfDisc />}
            label="Stealf user"
            disabled
          />
        </View>

        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>
            Bank transfer
          </Kicker>
          <GlassListRow
            leading={<UsdFlagDisc />}
            label="USD bank transfer"
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
