import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ChoiceSheet } from '@/src/features/wallet-detail/ChoiceSheet';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { useToast } from '@/src/components/toast/ToastContext';

function Disc({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

export default function ReceiveChoice() {
  const router = useSafeRouter();
  const { show } = useToast();
  const close = () => router.back();

  return (
    <ChoiceSheet
      accentIcon={<Icons.arrDown size={30} color={T.ink} strokeWidth={2.5} />}
      title="Receive"
      subtitle="Choose one of the options below to deposit"
      onClose={close}
      options={[
        {
          key: 'fiat',
          icon: (
            <Disc>
              <Icons.bank size={22} color={T.ink} />
            </Disc>
          ),
          title: 'Fiat',
          subtitle: 'Receive assets via bank account',
          onPress: () => {
            close();
            show({ kind: 'info', title: 'Coming soon', message: 'Fiat deposits are coming soon.' });
          },
        },
        {
          key: 'crypto',
          icon: (
            <Disc>
              <Icons.dollar size={22} color={T.gold} />
            </Disc>
          ),
          title: 'Crypto',
          subtitle: 'Receive assets via solana wallet address',
          onPress: () => router.replace('/receive-qr?wallet=bank'),
        },
      ]}
    />
  );
}
