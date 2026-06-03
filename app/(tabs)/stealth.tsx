import { StealthWalletGate } from '@/src/features/stealth/screens/StealthWalletGate';
import { PayHub } from '@/src/features/stealth/screens/PayHub';

export default function StealthTab() {
  return (
    <StealthWalletGate>
      <PayHub />
    </StealthWalletGate>
  );
}
