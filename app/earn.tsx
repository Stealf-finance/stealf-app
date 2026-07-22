import { WalletScreen } from '@/src/features/wallet-detail/WalletScreen';

// Earn (yield) — services not wired yet, so a placeholder balance for now.
export default function EarnScreen() {
  return (
    <WalletScreen
      title="Earn"
      iconImage={require('@/assets/images/earn.png')}
      balanceUSD={0}
      assets={[]}
      tone="silver"
    />
  );
}
