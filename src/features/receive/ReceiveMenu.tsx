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
import { usePendingClaimsForCash } from '@/src/features/stealth/hooks/usePendingClaimsForCash';

export function ReceiveMenu() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { data: pendingUtxos, isLoading: claimsLoading } =
    usePendingClaimsForCash();
  const pendingCount = pendingUtxos?.length ?? 0;
  const hasClaims = pendingCount > 0;
  const claimsLabel = claimsLoading
    ? 'Checking incoming…'
    : hasClaims
    ? `${pendingCount} on the way`
    : 'No pending claims';
  const claimsSub = claimsLoading
    ? 'Scanning the network'
    : hasClaims
    ? 'Tap to review and claim'
    : 'Incoming transfers will appear here';

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
            leading={<IncomingDisc dim={!hasClaims} />}
            label={claimsLabel}
            sub={claimsSub}
            onPress={
              hasClaims
                ? () => router.push('/receive/claims')
                : undefined
            }
            accessibilityLabel="Open pending claims"
            trailing={
              hasClaims ? (
                <CountBadge count={pendingCount} />
              ) : (
                <EmptyTrailing />
              )
            }
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
              network is supported. Sending other tokens or chains will result
              in lost funds.
            </Text>
          </View>
        </View>
      </ScrollView>
    </CenterGlow>
  );
}

function IncomingDisc({ dim = false }: { dim?: boolean } = {}) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: dim
          ? 'rgba(255,255,255,0.10)'
          : 'rgba(230,192,121,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={
          dim
            ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.015)']
            : ['rgba(230,192,121,0.16)', 'rgba(163,123,46,0.04)']
        }
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Icons.clock
        size={16}
        color={dim ? T.inkFaint : '#e6c079'}
        strokeWidth={1.6}
      />
    </View>
  );
}

function EmptyTrailing() {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.18)',
        }}
      />
    </View>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          minWidth: 22,
          height: 22,
          paddingHorizontal: 7,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(230,192,121,0.4)',
          backgroundColor: 'rgba(230,192,121,0.12)',
        }}
      >
        <Text
          style={[
            sansation,
            {
              fontSize: 10,
              fontWeight: '700',
              color: '#e6c079',
              includeFontPadding: false,
            },
          ]}
        >
          {count}
        </Text>
      </View>
      <Icons.chevR size={14} color={T.inkFaint} />
    </View>
  );
}
