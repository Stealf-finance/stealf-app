// src/features/stealth/components/PayMethodTiles.tsx
import { View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { GlassTile } from '@/src/features/receive/components/GlassTile';
import {
  StealfDisc,
  UsdcDisc,
  BankDisc,
} from '@/src/features/receive/components/Discs';
import { PAY_METHODS } from '@/src/features/stealth/lib/payMethods';

const DISCS = {
  stealf: StealfDisc,
  usdc: UsdcDisc,
  bank: BankDisc,
} as const;

/** The "New payment" row: Private / Simple / Bank. Each routes to an existing
 *  send flow; the disabled Bank tile shows GlassTile's built-in "Soon" pill. */
export function PayMethodTiles() {
  const router = useSafeRouter();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {PAY_METHODS.map((m) => {
        const Disc = DISCS[m.discKey];
        return (
          <GlassTile
            key={m.key}
            leading={<Disc />}
            label={m.label}
            disabled={m.disabled}
            onPress={m.route ? () => router.push(m.route as never) : undefined}
          />
        );
      })}
    </View>
  );
}
