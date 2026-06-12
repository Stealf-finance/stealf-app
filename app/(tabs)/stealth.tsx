import { PayHub } from '@/src/features/stealth/screens/PayHub';

// The Pay hub is shown ungated — the create/import setup screen is gated on the
// stealth-wallet-dependent flows instead (private/simple transfer, move).
export default function StealthTab() {
  return <PayHub />;
}
