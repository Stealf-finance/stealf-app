import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { MoveFlow } from '@/src/features/moove/MoveFlow';
import { StealthWalletGate } from '@/src/features/stealth/screens/StealthWalletGate';

export default function MooveModal() {
  const router = useSafeRouter();
  // Move depends on the stealth wallet — gate it on setup, with a back button
  // that dismisses the modal if the user hasn't created one yet.
  return (
    <StealthWalletGate onExit={() => router.back()}>
      <MoveFlow />
    </StealthWalletGate>
  );
}
