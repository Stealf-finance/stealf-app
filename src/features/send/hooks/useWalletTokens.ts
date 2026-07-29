/**
 * Tokens available to pick from a wallet source (bank / stealth public ATA, or
 * the stealth encrypted balances). Extracted from the old AssetPickerScreen so
 * the Send / Shield / Move flows can drive the shared TokenSelectSheet.
 */
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { useBalance } from '@/src/features/bank/hooks/useBalance';
import { useSolPrice } from '@/src/features/solana/hooks/useSolPrice';
import { useEncryptedBalances } from '@/src/features/stealth/hooks/useEncryptedBalances';
import { SOL_ICON_URI, SOL_MINT } from '@/src/constants/solana';
import type { SelectedAsset } from '../lib/selectedAssetStore';

export type WalletTokenSource = 'bank' | 'stealth' | 'encrypted';
export type WalletToken = SelectedAsset & { name: string };

const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  WSOL: 9,
  USDC: 6,
  USDT: 6,
  JUP: 6,
  BONK: 5,
};

const TOKEN_NAMES: Record<string, string> = {
  SOL: 'Solana',
  USDC: 'USD Coin',
  USDT: 'Tether',
  JUP: 'Jupiter',
  BONK: 'Bonk',
};

export function useWalletTokens(source: WalletTokenSource): WalletToken[] {
  const { user } = useAuth();
  const isEncrypted = source === 'encrypted';
  const publicSourceAddress = isEncrypted
    ? null
    : source === 'bank'
      ? user?.bankWallet ?? null
      : user?.stealfWallet ?? null;

  const { data: walletBalance } = useBalance(publicSourceAddress);
  const { data: encrypted } = useEncryptedBalances();
  const { data: solPrice } = useSolPrice();

  if (isEncrypted) {
    return (encrypted?.tokens ?? [])
      .filter((t) => t.amount > 0)
      .map((t) => {
        const isSol = t.mint === SOL_MINT || t.symbol === 'SOL';
        return {
          mint: t.mint,
          symbol: t.symbol,
          name: TOKEN_NAMES[t.symbol] ?? t.symbol,
          decimals: t.decimals,
          iconSource: undefined,
          iconUri: isSol ? SOL_ICON_URI : t.iconUri,
          balance: t.amount,
          balanceUSD: t.amountUSD,
          price: t.amount > 0 ? t.amountUSD / t.amount : 0,
        };
      });
  }

  return (walletBalance?.tokens ?? []).map((t) => {
    const isSol = t.tokenMint === null || t.tokenSymbol === 'SOL';
    const symbol = t.tokenSymbol;
    const decimals = TOKEN_DECIMALS[symbol] ?? 6;
    const price =
      isSol && typeof solPrice === 'number' && solPrice > 0
        ? solPrice
        : t.balance > 0
          ? t.balanceUSD / t.balance
          : 0;
    return {
      mint: isSol ? SOL_MINT : (t.tokenMint as string),
      symbol,
      name: TOKEN_NAMES[symbol] ?? symbol,
      decimals,
      iconSource: undefined,
      iconUri: isSol ? SOL_ICON_URI : t.tokenIcon ?? undefined,
      balance: t.balance,
      balanceUSD: t.balanceUSD,
      price,
    };
  });
}
