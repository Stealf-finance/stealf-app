import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { Icons } from '@/src/design-system/icons';
import { serif, sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useToast } from '@/src/components/toast/ToastContext';

// Virtual bank accounts aren't live yet — these are sample details so the page
// can be designed/reviewed ahead of the real IBAN integration.
const ACCOUNT = {
  currency: 'Euro',
  flag: '🇪🇺',
  beneficiary: 'John Doe',
  iban: 'LT82 3250 0177 4587 2046',
  bic: 'REVOLT21',
  bankName: 'Stealf Bank UAB',
  bankAddress: 'Konstitucijos ave. 21B, 08130, Vilnius, Lithuania',
  correspondentBic: 'BARCGB22',
};

const ROWS: { label: string; value: string }[] = [
  { label: 'Beneficiary', value: ACCOUNT.beneficiary },
  { label: 'IBAN', value: ACCOUNT.iban },
  { label: 'BIC / SWIFT', value: ACCOUNT.bic },
  {
    label: 'Bank name & address',
    value: `${ACCOUNT.bankName}, ${ACCOUNT.bankAddress}`,
  },
  { label: 'Correspondent bank BIC', value: ACCOUNT.correspondentBic },
];

export function AccountDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { show } = useToast();

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    show({ kind: 'success', title: 'Copied', message: `${label} copied.` });
  };

  const shareDetails = () => {
    show({
      kind: 'info',
      title: 'Coming soon',
      message: 'Virtual bank accounts are coming soon.',
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
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Coming-soon badge — sample data until virtual accounts go live. */}
        <View
          style={{
            alignSelf: 'center',
            marginBottom: 18,
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: T.hairlineStrong,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <Text
            style={[
              sansation,
              {
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: T.inkDim,
              },
            ]}
          >
            Coming soon · sample details
          </Text>
        </View>

        {/* Currency */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 26 }}>{ACCOUNT.flag}</Text>
          <Text
            style={[
              sansation,
              { fontSize: 18, color: T.ink, fontWeight: '600', marginTop: 6 },
            ]}
          >
            {ACCOUNT.currency}
          </Text>
        </View>

        {/* Section kicker */}
        <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 22 }}>
          <Text
            style={[
              sansation,
              {
                fontSize: 9,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: T.inkFaint,
              },
            ]}
          >
            International transfers only
          </Text>
        </View>

        {/* Detail rows — tap to copy */}
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: T.hairline,
            backgroundColor: 'rgba(255,255,255,0.03)',
            overflow: 'hidden',
          }}
        >
          {ROWS.map((r, i) => (
            <Pressable
              key={r.label}
              onPress={() => copy(r.label, r.value)}
              accessibilityRole="button"
              accessibilityLabel={`Copy ${r.label}`}
              style={({ pressed }) => ({
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: T.trace,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: pressed ? 0.6 : 1,
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
                  {r.label}
                </Text>
                <Text
                  style={[
                    sansation,
                    { fontSize: 15, color: T.ink, marginTop: 4 },
                  ]}
                >
                  {r.value}
                </Text>
              </View>
              <Icons.copy size={16} color={T.inkFaint} />
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 22 }}>
          <PillBtn
            label="Share details"
            variant="primary"
            tone="silver"
            onPress={shareDetails}
          />
        </View>

        <Text
          style={[
            sansation,
            {
              fontSize: 11,
              color: T.inkFaint,
              marginTop: 18,
              lineHeight: 16,
              textAlign: 'center',
            },
          ]}
        >
          Sample details shown while virtual accounts are in development. Once
          live, deposits will be protected up to the applicable limit.
        </Text>
      </ScrollView>
    </CenterGlow>
  );
}
