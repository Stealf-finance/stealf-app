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

/** Send hub. Full grouped version (Cash + Wallet) from the home FAB;
 *  `?scope=cash` (the Cash screen) shows only that account's options. */
export default function SendChoice() {
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
              subtitle: 'Send assets to a bank account',
              onPress: () => {
                close();
                show({
                  kind: 'info',
                  title: 'Coming soon',
                  message: 'Fiat transfers are coming soon.',
                });
              },
            },
            {
              key: 'stablecoins',
              icon: (
                <Disc>
                  <Icons.dollar size={22} color={T.ink} />
                </Disc>
              ),
              title: 'Stablecoins',
              subtitle: 'Send assets to a solana wallet address',
              onPress: () => router.replace('/send/flow?tone=silver&wallet=bank'),
            },
          ],
        },
        {
          label: 'Wallet account',
          options: [
            {
              key: 'simple',
              icon: (
                <Disc>
                  <Icons.arrUpRight size={22} color={T.ink} />
                </Disc>
              ),
              title: 'Simple send',
              subtitle: 'Send from your wallet on-chain balance',
              onPress: () =>
                router.replace('/send/flow?tone=silver&wallet=stealth'),
            },
            {
              key: 'private',
              icon: (
                <Disc>
                  <Icons.shieldFull size={22} color={T.ink} />
                </Disc>
              ),
              title: 'Private send',
              subtitle: 'Send privately from your encrypted balance',
              onPress: () =>
                router.replace('/send/flow?mode=private&wallet=stealth'),
            },
          ],
        },
      ];

  const cashOnly = scope === 'cash';

  return (
    <ChoiceSheet
      accentIcon={<Icons.arrUp size={30} color={T.ink} strokeWidth={2.5} />}
      title="Send"
      subtitle="Choose one of the options below to transfer"
      onClose={close}
      // Scoped to one account → flat list; home FAB → full grouped hub.
      options={cashOnly ? sections[0].options : undefined}
      sections={cashOnly ? undefined : sections}
    />
  );
}
