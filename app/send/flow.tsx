import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { SendFlow } from '@/src/features/send/SendFlow';
import { StealthWalletGate } from '@/src/features/stealth/screens/StealthWalletGate';
import { Tone } from '@/src/design-system/palettes';

export default function SendFlowRoute() {
  const router = useSafeRouter();
  const { tone, wallet, mode } = useLocalSearchParams<{
    tone?: string;
    wallet?: string;
    mode?: string;
  }>();
  const resolvedTone: Tone = tone === 'gold' ? 'gold' : 'silver';
  const resolvedWallet =
    wallet === 'stealth' ? 'stealth' : wallet === 'bank' ? 'bank' : undefined;
  const resolvedMode = mode === 'private' ? 'private' : 'public';

  const flow = (
    <SendFlow
      tone={resolvedTone}
      wallet={resolvedWallet}
      mode={resolvedMode}
    />
  );

  // Private / simple transfers originate from the stealth wallet — gate them on
  // setup. Bank sends (wallet=bank) don't need a stealth wallet, so they pass
  // through ungated.
  if (resolvedWallet === 'stealth') {
    return (
      <StealthWalletGate onExit={() => router.back()}>
        {flow}
      </StealthWalletGate>
    );
  }
  return flow;
}
