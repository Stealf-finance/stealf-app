export type network = 'mainnet' | 'devnet';

export const ACTIVE_NETWORK: network = 'mainnet';

export const UMBRA_CONFIG = ({
  mainnet: {
    network: 'mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    rpcSubscriptionsUrl: 'wss://api.mainnet-beta.solana.com',
    indexerApi: 'https://utxo-indexer.api.umbraprivacy.com',
    relayerApi: 'https://relayer.api.umbraprivacy.com',
  },
  devnet: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    rpcSubscriptionsUrl: 'wss://api.devnet.solana.com',
    indexerApi: 'https://utxo-indexer.api-devnet.umbraprivacy.com',
    relayerApi: 'https://relayer.api-devnet.umbraprivacy.com',
  },
} as const)[ACTIVE_NETWORK];

//devnet
export const dUSDC = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";
export const dUSDT = "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6";