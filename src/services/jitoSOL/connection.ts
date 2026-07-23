import { Connection } from '@solana/web3.js';
import { getEnv } from '../env';

let _connection: Connection | null = null;

export function getJitoConnection(): Connection {
  if (!_connection) {
    const env = getEnv();
    const url = env.EXPO_PUBLIC_JITO_RPC_URL ?? env.EXPO_PUBLIC_SOLANA_RPC_URL;
    _connection = new Connection(url, 'confirmed');
  }
  return _connection;
}
