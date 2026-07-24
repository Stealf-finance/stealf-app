import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';
import { AvailableProducts } from '@/src/features/grow/components/AvailableProducts';

// Earn (yield) — no staked position yet, so a $0 balance hero over the
// "Available products" catalog (JitoSOL liquid staking).
export default function EarnScreen() {
  return (
    <WalletScreen
      title="Earn"
      iconImage={require('@/assets/images/earn.png')}
      balanceUSD={0}
      assets={[]}
      tone="silver"
      footer={<AvailableProducts />}
    />
  );
}
