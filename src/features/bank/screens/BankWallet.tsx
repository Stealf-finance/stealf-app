import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CircleIconBtn } from '@/src/design-system/primitives/CircleIconBtn';
import { SquareActionTile } from '@/src/design-system/primitives/SquareActionTile';
import { TxRow } from '@/src/design-system/primitives/TxRow';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';

const S = txPalette('silver');

export function BankWallet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      {/* Greeting row */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 24,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: S.inkDim, fontWeight: '300' }}>
          Good morning, <Text style={{ color: S.ink }}>Thomas</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CircleIconBtn iconKey="card" onPress={() => router.push('/card')} />
          <CircleIconBtn iconKey="bell" hasDot />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Kicker + balance */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <View
              style={{ width: 18, height: 1, backgroundColor: S.accentDim }}
            />
            <Text
              style={[
                sansation,
                {
                  fontSize: 10,
                  letterSpacing: 3.2,
                  textTransform: 'uppercase',
                  color: S.accent,
                  fontWeight: '700',
                },
              ]}
            >
              Bank Wallet
            </Text>
            <View
              style={{ width: 18, height: 1, backgroundColor: S.accentDim }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={[
                serif,
                {
                  fontSize: 36,
                  color: S.accent,
                  fontStyle: 'italic',
                  lineHeight: 36,
                  includeFontPadding: false,
                },
              ]}
            >
              $
            </Text>
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 76,
                  letterSpacing: -3.04,
                  lineHeight: 76,
                  color: S.ink,
                  includeFontPadding: false,
                },
              ]}
            >
              405
            </Text>
            <Text
              style={[
                sansationLight,
                {
                  fontSize: 32,
                  color: S.inkDim,
                  letterSpacing: -0.64,
                  lineHeight: 32,
                  includeFontPadding: false,
                },
              ]}
            >
              .46
            </Text>
          </View>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: S.hairline,
            marginBottom: 22,
          }}
        />

        {/* Action tiles */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingBottom: 28,
          }}
        >
          <SquareActionTile iconKey="arrDown" label="Receive" />
          <SquareActionTile iconKey="arrUp" label="Send" />
          <SquareActionTile
            iconKey="moove"
            label="Moove"
            accent
            accentTone="silver"
            onPress={() => router.push('/moove')}
          />
          <SquareActionTile
            iconKey="more"
            label="More"
            iconColor="#ffffff"
          />
        </View>

        <CardPromo />

        {/* Transactions header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 4,
          }}
        >
          <Text
            style={[
              sansationLight,
              { fontSize: 22, letterSpacing: -0.44, color: S.ink },
            ]}
          >
            Transactions
          </Text>
          <Pressable
            accessibilityRole="link"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text
              style={[
                serif,
                { fontSize: 13, color: S.accent, fontStyle: 'italic' },
              ]}
            >
              see all
            </Text>
            <Icons.arrRight size={11} color={S.accent} />
          </Pressable>
        </View>

        <View style={{ paddingTop: 6 }}>
          <TxRow
            type="received"
            title="Received · SOL"
            meta="21 Apr · 04:41 am"
            amount="+$176.76"
          />
          <TxRow
            type="sent"
            title="Card · Carrefour"
            meta="21 Apr · 11:20 am"
            amount="−$34.50"
          />
          <TxRow
            type="received"
            title="SEPA · Louis"
            meta="20 Apr · 09:01 am"
            amount="+$51.94"
          />
          <TxRow
            type="received"
            title="Received · SOL"
            meta="20 Apr · 08:51 am"
            amount="+$176.76"
            last
          />
        </View>
      </ScrollView>
    </View>
  );
}

function CardPromo() {
  return (
    <View
      style={{
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        marginBottom: 28,
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 20 },
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          paddingTop: 28,
          paddingHorizontal: 26,
          paddingBottom: 26,
        }}
      >
        {/* top sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 18,
          }}
        >
          <View
            style={{ width: 22, height: 1, backgroundColor: S.accentDim }}
          />
          <Text
            style={[
              sansation,
              {
                fontSize: 11,
                letterSpacing: 3.52,
                textTransform: 'uppercase',
                color: S.accent,
                fontWeight: '700',
              },
            ]}
          >
            Bank without limits
          </Text>
          <View
            style={{ width: 22, height: 1, backgroundColor: S.accentDim }}
          />
        </View>

        <Text
          style={[
            sansationLight,
            {
              fontSize: 26,
              letterSpacing: -0.65,
              lineHeight: 31,
              color: S.ink,
              textAlign: 'center',
              marginBottom: 4,
            },
          ]}
        >
          Your physical card
        </Text>
        <Text
          style={[
            serif,
            {
              fontSize: 15,
              fontStyle: 'italic',
              color: S.accent,
              textAlign: 'center',
              marginBottom: 22,
            },
          ]}
        >
          Ships within 48h.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Pressable
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Text
              style={[
                sansation,
                {
                  fontSize: 11,
                  letterSpacing: 2.64,
                  textTransform: 'uppercase',
                  color: S.ink,
                  fontWeight: '700',
                },
              ]}
            >
              Get your bank account
            </Text>
            <Icons.arrRight size={12} color={S.ink} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
