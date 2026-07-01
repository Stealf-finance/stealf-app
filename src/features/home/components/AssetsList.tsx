import { Text, View } from 'react-native';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useEncryptedBalances } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { txPalette } from '@/src/design-system/palettes';
import { sansationLight } from '@/src/design-system/typography';
import { SOL_ICON_URI } from '@/src/constants/solana';
import { AssetRow } from '@/src/design-system/primitives/AssetRow';

const SILVER = txPalette('silver');
const GOLD = txPalette('gold');

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

type Row = {
  key: string;
  iconSource: { uri: string } | undefined;
  symbol: string;
  caption: string;
  priceLabel: string;
};

export function AssetsList({ card }: { card: 'stealf' | 'encrypted' }) {
  const { user } = useAuth();
  const publicBal = useBalance(card === 'stealf' ? user?.stealfWallet ?? null : null);
  const encrypted = useEncryptedBalances();

  const isEncrypted = card === 'encrypted';
  const pal = isEncrypted ? GOLD : SILVER;

  const rows: Row[] = isEncrypted
    ? (encrypted.data?.tokens ?? []).slice(0, 6).map((t) => ({
        key: t.mint,
        iconSource: t.iconUri ? { uri: t.iconUri } : undefined,
        symbol: t.symbol,
        caption: t.amount > 0 ? `${trim(t.amount)} · encrypted` : 'encrypted',
        priceLabel: `$${t.amountUSD.toFixed(2)}`,
      }))
    : (publicBal.data?.tokens ?? []).slice(0, 6).map((t) => ({
        key: t.tokenMint ?? t.tokenSymbol,
        iconSource: t.tokenIcon
          ? { uri: t.tokenIcon }
          : t.tokenSymbol === 'SOL'
            ? { uri: SOL_ICON_URI }
            : undefined,
        symbol: t.tokenSymbol,
        caption: t.balance > 0 ? `${trim(t.balance)} · on-chain` : 'on-chain',
        priceLabel: `$${t.balanceUSD.toFixed(2)}`,
      }));

  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={[
          sansationLight,
          { fontSize: 22, letterSpacing: -0.44, color: pal.ink, marginBottom: 4 },
        ]}
      >
        Assets
      </Text>
      <View style={{ paddingTop: 6 }}>
        {rows.length === 0 ? (
          <Text style={{ fontSize: 13, color: pal.inkFaint, paddingVertical: 14 }}>
            No assets yet.
          </Text>
        ) : (
          rows.map((r, i) => (
            <AssetRow
              key={r.key}
              iconSource={r.iconSource}
              symbol={r.symbol}
              caption={r.caption}
              priceLabel={r.priceLabel}
              ink={pal.ink}
              inkFaint={pal.inkFaint}
              hairline={pal.hairline}
              last={i === rows.length - 1}
            />
          ))
        )}
      </View>
    </View>
  );
}
