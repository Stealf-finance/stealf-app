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

/** Receive hub. One account, so a flat list rather than grouped sections. */
export default function ReceiveChoice() {
  const router = useSafeRouter();
  const { show } = useToast();
  const close = () => router.back();

  const options = [
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
        show({
          kind: 'info',
          title: 'Coming soon',
          message: 'Fiat deposits are coming soon.',
        });
      },
    },
    {
      key: 'crypto',
      icon: (
        <Disc>
          <Icons.qr size={22} color={T.ink} />
        </Disc>
      ),
      title: 'Crypto',
      subtitle: 'Receive assets on your Solana wallet address',
      onPress: () => router.replace('/receive-qr'),
    },
  ];

  return (
    <ChoiceSheet
      accentIcon={<Icons.arrDown size={30} color={T.ink} strokeWidth={2.5} />}
      title="Receive"
      subtitle="Choose one of the options below to deposit"
      onClose={close}
      options={options}
    />
  );
}
