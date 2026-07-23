import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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

/** Receive hub. Full grouped version (Cash + Wallet) from the home FAB;
 *  `?scope=cash` (the Cash screen) shows only that account's options. */
export default function ReceiveChoice() {
  const router = useSafeRouter();
  const { show } = useToast();
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const close = () => router.back();

  const sections = [
        {
          label: 'Cash account',
          options: [
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
              key: 'crypto-bank',
              icon: (
                <Disc>
                  <Icons.dollar size={22} color={T.ink} />
                </Disc>
              ),
              title: 'Stablecoins',
              subtitle: 'Receive assets via solana wallet address',
              onPress: () => router.replace('/receive-qr?wallet=bank'),
            },
          ],
        },
        {
          label: 'Wallet account',
          options: [
            {
              key: 'crypto-wallet',
              icon: (
                <Disc>
                  <Icons.qr size={22} color={T.ink} />
                </Disc>
              ),
              title: 'Crypto',
              subtitle: 'Receive assets on your wallet address',
              onPress: () => router.replace('/receive-qr?wallet=stealth'),
            },
          ],
        },
      ];

  const cashOnly = scope === 'cash';

  return (
    <ChoiceSheet
      accentIcon={<Icons.arrDown size={30} color={T.ink} strokeWidth={2.5} />}
      title="Receive"
      subtitle="Choose one of the options below to deposit"
      onClose={close}
      // Scoped to one account → flat list; home FAB → full grouped hub.
      options={cashOnly ? sections[0].options : undefined}
      sections={cashOnly ? undefined : sections}
    />
  );
}
