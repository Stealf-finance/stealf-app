import { getStakePoolAccount } from '@solana/spl-stake-pool';
import { JITO_STAKE_POOL_ADDRESS } from './constants';
import { getJitoConnection } from './connection';
import { poolConversionRate } from './poolMath';

export type JitoPoolInfo = {
  totalLamports: bigint;
  totalPoolTokens: bigint;
  solJitoConversion: number;
  poolMint: string;
  reserveStake: string;
  validatorList: string;
  manager: string;
};

export async function getPoolInfo(): Promise<JitoPoolInfo> {
  const connection = getJitoConnection();
  const stakePoolAccount = await getStakePoolAccount(
    connection,
    JITO_STAKE_POOL_ADDRESS,
  );

  const data = stakePoolAccount?.account?.data;
  if (!data) {
    throw new Error('Failed to fetch stake pool account data');
  }

  const totalLamports = BigInt(data.totalLamports.toString());
  const totalPoolTokens = BigInt(data.poolTokenSupply.toString());

  return {
    totalLamports,
    totalPoolTokens,
    solJitoConversion: poolConversionRate(totalLamports, totalPoolTokens),
    poolMint: data.poolMint.toBase58(),
    reserveStake: data.reserveStake.toBase58(),
    validatorList: data.validatorList.toBase58(),
    manager: data.manager.toBase58(),
  };
}
