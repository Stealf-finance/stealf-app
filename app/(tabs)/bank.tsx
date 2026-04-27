import { TonalBackground } from '@/src/design-system/primitives/TonalBackground';
import { BankWallet } from '@/src/features/bank/screens/BankWallet';

export default function BankTab() {
  return (
    <TonalBackground tone="silver">
      <BankWallet />
    </TonalBackground>
  );
}
