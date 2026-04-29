import { useEffect, type PropsWithChildren } from 'react';
import { useAuth } from '@/src/features/onboarding/context/AuthContext';
import { socketService } from '@/src/services/real-time/socket';

export function SocketProvider({ children }: PropsWithChildren) {
  const { session, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !session) {
      if (__DEV__)
        console.log(
          '[SocketProvider] skip connect (auth=' +
            isAuthenticated +
            ', session=' +
            !!session +
            ')',
        );
      return;
    }
    if (__DEV__) console.log('[SocketProvider] connecting…');
    socketService.connect(session.sessionToken);
    return () => {
      if (__DEV__) console.log('[SocketProvider] cleanup → disconnect');
      socketService.disconnect();
    };
  }, [isAuthenticated, session]);

  return <>{children}</>;
}
