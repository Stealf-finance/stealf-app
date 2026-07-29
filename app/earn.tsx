import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import { AvailableProducts } from '@/src/features/earn/components/AvailableProducts';
import { StealthWalletGate } from '@/src/features/stealth/screens/StealthWalletGate';
import { useSafeRouter } from '@/src/lib/useSafeRouter';

// Earn (yield) — no staked position yet, so a $0 balance hero over the
// "Available products" catalog (JitoSOL liquid staking).
export default function EarnScreen() {
  const router = useSafeRouter();
  // Gate on the stealth wallet — no wallet yet renders the create/import setup
  // screen, with a back button that dismisses this route.
  return (
    <StealthWalletGate onExit={() => router.back()}>
      <WalletScreen
        title="Earn"
        iconImage={require('@/assets/images/earn.png')}
        balanceUSD={0}
        assets={[]}
        tone="silver"
        footer={<AvailableProducts />}
      />
    </StealthWalletGate>
  );
}
