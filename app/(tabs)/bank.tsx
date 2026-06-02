import { HomeHub } from '@/src/features/home/screens/HomeHub';

// HomeHub owns its background (silver → gold tonal halo cross-faded with the
// balance carousel), like StealthHub — so no TonalBackground wrapper here.
export default function BankTab() {
  return <HomeHub />;
}
