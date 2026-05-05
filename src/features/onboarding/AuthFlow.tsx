import { useState } from 'react';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AuthScreen } from './screens/AuthScreen';
import { EmailEntryScreen } from './screens/EmailEntryScreen';
import { OtpScreen } from './screens/OtpScreen';

type Mode = 'auth' | 'email' | 'otp';

const FADE_OUT = 220;
const FADE_IN = 260;

/**
 * Auth flow shell. Owns mode + scratch state (email, otpId) for the
 * three-screen flow and animates between them with a sequential fade
 * (out → swap → in) so screens never overlap mid-transition. A single
 * route at app/(auth)/welcome.tsx renders this — keeping email + otp
 * out of the Expo Router stack avoids the parallel crossfade that
 * makes those transitions feel like ghosting.
 */
export function AuthFlow() {
  const [mode, setMode] = useState<Mode>('auth');
  const [email, setEmail] = useState('');
  const [otpId, setOtpId] = useState('');

  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const switchMode = (next: Mode) => {
    opacity.value = withTiming(0, { duration: FADE_OUT }, (done) => {
      if (!done) return;
      runOnJS(setMode)(next);
      opacity.value = withTiming(1, { duration: FADE_IN });
    });
  };

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {mode === 'auth' && <AuthScreen onEmail={() => switchMode('email')} />}
      {mode === 'email' && (
        <EmailEntryScreen
          onBack={() => switchMode('auth')}
          onSent={(emailVal, otpIdVal) => {
            setEmail(emailVal);
            setOtpId(otpIdVal);
            switchMode('otp');
          }}
        />
      )}
      {mode === 'otp' && (
        <OtpScreen
          email={email}
          otpId={otpId}
          onBack={() => switchMode('email')}
        />
      )}
    </Animated.View>
  );
}
