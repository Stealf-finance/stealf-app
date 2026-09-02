import { useEffect } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { ACTIVE_NETWORK } from '@/src/services/umbra/constant';
import { useUmbraRegistration } from './useUmbraRegistration';

// Umbra's program id differs per network, so a devnet registration means
// nothing on mainnet: trust the persisted flag only while it names ACTIVE_NETWORK.
export function useUmbraRegistered() {
  const { user, setUser } = useAuth();
  const wallet = user?.bankWallet ?? null;

  const persisted =
    user?.bankRegisteredNetwork === ACTIVE_NETWORK
      ? user.bankRegistered
      : undefined;

  const { data: probed, isPending: checking } = useUmbraRegistration(
    persisted === undefined ? wallet : null,
  );

  useEffect(() => {
    if (!user) return;
    if (persisted !== undefined || typeof probed !== 'boolean') return;
    setUser({
      ...user,
      bankRegistered: probed,
      bankRegisteredNetwork: ACTIVE_NETWORK,
    });
  }, [user, persisted, probed, setUser]);

  return { registered: persisted ?? probed, checking };
}
