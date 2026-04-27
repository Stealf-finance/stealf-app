import { useEffect, type PropsWithChildren } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { socketService } from '@/src/services/real-time/socket';

export function SocketProvider({ children }: PropsWithChildren) {
  const { session, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !session) return;
    socketService.connect(session.token);
    return () => socketService.disconnect();
  }, [isAuthenticated, session]);

  return <>{children}</>;
}
