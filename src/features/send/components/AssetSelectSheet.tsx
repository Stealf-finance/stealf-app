/**
 * Wallet asset picker — the shared TokenSelectSheet wired to a wallet source
 * (bank / stealth / encrypted), showing each token's balance + USD value. On
 * select it writes the global `selectedAssetStore` the Send / Shield / Move
 * flows read. Replaces the old full-screen /asset-picker route.
 */
import { TokenSelectSheet } from '@/src/design-system/primitives/TokenSelectSheet';
import { setSelectedAsset } from '../lib/selectedAssetStore';
import { useWalletTokens, type WalletTokenSource } from '../hooks/useWalletTokens';

const trim = (n: number) => n.toFixed(4).replace(/\.?0+$/, '');

export function AssetSelectSheet({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  source: WalletTokenSource;
}) {
  const tokens = useWalletTokens(source);

  return (
    <TokenSelectSheet
      open={open}
      onClose={onClose}
      items={tokens}
      keyOf={(t) => t.mint}
      toRow={(t) => ({
        symbol: t.symbol,
        name: t.name,
        iconUri: t.iconUri,
        iconSource: t.iconSource,
        balanceLabel: `${trim(t.balance)} ${t.symbol}`,
        valueLabel: t.balanceUSD > 0 ? `$${t.balanceUSD.toFixed(2)}` : undefined,
      })}
      onSelect={(t) =>
        setSelectedAsset({
          mint: t.mint,
          symbol: t.symbol,
          decimals: t.decimals,
          iconSource: t.iconSource,
          iconUri: t.iconUri,
          balance: t.balance,
          balanceUSD: t.balanceUSD,
          price: t.price,
        })
      }
      title="Select asset"
      emptyLabel="No tokens in this wallet yet."
    />
  );
}
