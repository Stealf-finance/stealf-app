import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checkVerificationStatus } from '../api/onboarding';
import type { VerificationStatus } from '../types';

const POLL_INTERVAL_MS = 1500;

interface UseEmailVerificationPollingParams {
  preAuthToken: string | null;
  enabled: boolean;
  onVerified: (data: { email: string; pseudo: string }) => void;
}

export function useEmailVerificationPolling({
  preAuthToken,
  enabled,
  onVerified,
}: UseEmailVerificationPollingParams) {
  const queryClient = useQueryClient();
  const queryKey = ['onboarding', 'verification', preAuthToken] as const;

  const query = useQuery<VerificationStatus | null>({
    queryKey,
    queryFn: () => (preAuthToken ? checkVerificationStatus(preAuthToken) : Promise.resolve(null)),
    enabled: !!preAuthToken && enabled,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (data?.verified) return false;
      return POLL_INTERVAL_MS;
    },
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!query.data?.verified) return;
    const { email, pseudo } = query.data;
    if (email && pseudo) {
      onVerified({ email, pseudo });
      queryClient.removeQueries({ queryKey });
    }
  }, [query.data, onVerified, queryClient, queryKey]);

  return {
    isPolling: !!preAuthToken && enabled && !query.data?.verified,
    verified: query.data?.verified === true,
  };
}
