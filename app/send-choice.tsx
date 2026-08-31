import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ChoiceSheet } from '@/src/features/wallet-detail/ChoiceSheet';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

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

/** Send hub. One account, so a flat list rather than grouped sections. */
export default function SendChoice() {
  const router = useSafeRouter();
  const close = () => router.back();

  const options = [
    {
      key: 'simple',
      icon: (
        <Disc>
          <Icons.arrUpRight size={22} color={T.ink} />
        </Disc>
      ),
      title: 'Simple send',
      subtitle: 'Send from your on-chain balance',
      onPress: () => router.replace('/send/flow'),
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
      onPress: () => router.replace('/send/flow?mode=private'),
    },
  ];

  return (
    <ChoiceSheet
      accentIcon={<Icons.arrUp size={30} color={T.ink} strokeWidth={2.5} />}
      title="Send"
      subtitle="Choose one of the options below to transfer"
      onClose={close}
      options={options}
    />
  );
}
