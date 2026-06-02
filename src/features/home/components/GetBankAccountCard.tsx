import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import { sansation, sansationLight } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { useToast } from '@/src/components/toast/ToastContext';

/** Promo card under the Total balance: CTA to open a virtual bank account. */
export function GetBankAccountCard() {
  const { show } = useToast();
  return (
    <Pressable
      onPress={() =>
        show({
          kind: 'info',
          title: 'Coming soon',
          message: 'Virtual bank accounts are coming soon.',
        })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 8 })}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: T.hairlineStrong,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: T.hairline,
          }}
        >
          <Icons.bank size={22} color={T.ink} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[sansation, { fontSize: 16, color: T.ink, fontWeight: '600' }]}>
            Get your bank account
          </Text>
          <Text
            style={[sansationLight, { fontSize: 12, color: T.inkDim, marginTop: 3 }]}
            numberOfLines={2}
          >
            Open a virtual IBAN to send and receive money.
          </Text>
        </View>
        <Icons.arrUpRight size={18} color={T.inkFaint} />
      </LinearGradient>
    </Pressable>
  );
}
