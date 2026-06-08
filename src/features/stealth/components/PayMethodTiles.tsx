// src/features/stealth/components/PayMethodTiles.tsx
import { View } from 'react-native';
import { useSafeRouter } from '@/src/lib/useSafeRouter';
import { GlassTile } from '@/src/features/receive/components/GlassTile';
import {
  UmbraDisc,
  SolanaTokenDisc,
  BankDiscSquare,
  MoveDisc,
  StealfDisc,
} from '@/src/features/receive/components/Discs';
import { PAY_METHODS, type PayMethod } from '@/src/features/stealth/lib/payMethods';

const DISCS = {
  umbra: UmbraDisc,
  solana: SolanaTokenDisc,
  bank: BankDiscSquare,
  move: MoveDisc,
  stealf: StealfDisc,
} as const;

const COLS = 3;

/** The "New payment" grid: Private / Simple / Bank / Moove / Stealf tag. Each
 *  routes to an existing flow; disabled tiles show GlassTile's "Soon" pill. */
export function PayMethodTiles() {
  const router = useSafeRouter();

  // Chunk into rows of COLS and pad the last row with spacers so every tile
  // stays at 1/COLS width.
  const rows: (PayMethod | null)[][] = [];
  for (let i = 0; i < PAY_METHODS.length; i += COLS) {
    const row: (PayMethod | null)[] = PAY_METHODS.slice(i, i + COLS);
    while (row.length < COLS) row.push(null);
    rows.push(row);
  }

  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((m, c) => {
            if (!m) return <View key={`spacer-${c}`} style={{ flex: 1 }} />;
            const Disc = DISCS[m.discKey];
            return (
              <GlassTile
                key={m.key}
                leading={<Disc />}
                label={m.label}
                labelNumberOfLines={1}
                labelFontSize={12}
                disabled={m.disabled}
                borderless
                onPress={m.route ? () => router.push(m.route as never) : undefined}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
