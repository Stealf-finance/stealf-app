import { ScrollView, Text, View } from 'react-native';
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
  UsdcDisc,
  UsdFlagDisc,
} from '@/src/features/receive/components/Discs';

export function SendMenu() {
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
          Send money
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
            Bank transfer
          </Kicker>
          <GlassListRow
            leading={<UsdFlagDisc />}
            label="USD bank transfer"
            disabled
          />
        </View>

        <View>
          <Kicker style={{ marginBottom: 10, paddingLeft: 4 }}>
            Send by address
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
            onPress={() => router.push('/send/flow?tone=silver&wallet=bank')}
          />

          <View
            style={{
              marginTop: 10,
              paddingHorizontal: 4,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <View style={{ marginTop: 1 }}>
              <Icons.info size={12} color={T.inkFaint} />
            </View>
            <Text
              style={[
                sansation,
                {
                  flex: 1,
                  fontSize: 11,
                  color: T.inkFaint,
                  lineHeight: 16,
                },
              ]}
            >
              Only{' '}
              <Text style={{ color: T.ink, fontWeight: '500' }}>USDC</Text> on
              the{' '}
              <Text style={{ color: T.ink, fontWeight: '500' }}>Solana</Text>{' '}
              network is supported. Double-check the destination address before
              sending.
            </Text>
          </View>
        </View>
      </ScrollView>
    </CenterGlow>
  );
}
