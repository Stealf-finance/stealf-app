import { useQuery } from '@tanstack/react-query';
import { getPoolInfo, type JitoPoolInfo } from '@/src/services/jitoSOL/poolInfos';

export const jitoPoolQueries = {
  info: () => ['jito-pool-info'] as const,
};

export function usePoolInfo() {
  return useQuery<JitoPoolInfo>({
    queryKey: jitoPoolQueries.info(),
    queryFn: getPoolInfo,
    staleTime: 5 * 60_000, // pool totals move ~once per epoch
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
}
