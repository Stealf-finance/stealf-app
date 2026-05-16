import type { ImageSource } from 'expo-image';
import type { Asset } from '@/src/features/send/components/AssetPill';
import type { TokenBalance } from '@/src/features/bank/types';
import { SOL_ICON_URI } from '@/src/constants/solana';

const GRADIENTS: Record<string, [string, string]> = {
  SOL: ['#9945FF', '#14F195'],
  USDC: ['#2775CA', '#1a5390'],
  jitoSOL: ['#c9c9cc', '#5a5a5e'],
  BTC: ['#F7931A', '#a65e06'],
  ETH: ['#627EEA', '#3b4fa8'],
  EURC: ['#1a2c6b', '#0a1840'],
};

const ICONS: Record<string, ImageSource | number> = {
  SOL: { uri: SOL_ICON_URI },
};

const FALLBACK_GRADIENT: [string, string] = ['#9a9a9f', '#5a5a5e'];

const DISPLAY_NAMES: Record<string, string> = {
  SOL: 'Solana',
  USDC: 'USD Coin',
  jitoSOL: 'Jito staked SOL',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  EURC: 'Euro Coin',
};

function formatBalance(balance: number, decimals: number): string {
  if (balance === 0) return '0';
  const truncTo = Math.min(decimals, 6);
  const fixed = balance.toFixed(truncTo);
  return fixed.replace(/\.?0+$/, '');
}

function formatFiat(usd: number): string {
  if (usd >= 1000) return `$${Math.round(usd).toLocaleString('en-US')}`;
  return `$${usd.toFixed(2)}`;
}

// Stablecoins: backend may omit balanceUSD when the wallet is empty, so we
// hardcode parity here rather than fall back to 0.
const STABLE_PRICES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  EURC: 1,
};

export function mapTokenToAsset(token: TokenBalance): Asset {
  const derivedPrice =
    token.balance > 0 ? token.balanceUSD / token.balance : undefined;
  const priceUSD = STABLE_PRICES[token.tokenSymbol] ?? derivedPrice;

  // Prefer backend-resolved metadata (name from Jupiter, icon URI from
  // the token registry). Fall back to the hardcoded maps for tokens the
  // backend can't resolve, then to the symbol itself / gradient placeholder.
  const name =
    token.tokenName ?? DISPLAY_NAMES[token.tokenSymbol] ?? token.tokenSymbol;
  const iconSource = token.tokenIcon
    ? { uri: token.tokenIcon }
    : ICONS[token.tokenSymbol];

  return {
    mint: token.tokenMint,
    symbol: token.tokenSymbol,
    name,
    balance: formatBalance(token.balance, token.tokenDecimals),
    fiat: formatFiat(token.balanceUSD),
    gradient: GRADIENTS[token.tokenSymbol] ?? FALLBACK_GRADIENT,
    iconSource,
    priceUSD,
    decimals: token.tokenDecimals,
  };
}

export function mapTokensToAssets(tokens: TokenBalance[]): Asset[] {
  return tokens.map(mapTokenToAsset);
}
