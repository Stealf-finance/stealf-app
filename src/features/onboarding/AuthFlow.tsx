import { useState } from 'react';
import { useRouter } from 'expo-router';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Welcome } from './screens/Welcome';
import { Login } from './screens/Login';
import { OnboardWizard } from './OnboardWizard';

type Mode = 'welcome' | 'onboard' | 'login';

const FADE_OUT = 220;
const FADE_IN = 260;

export function AuthFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('welcome');

  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const switchMode = (next: Mode) => {
    opacity.value = withTiming(0, { duration: FADE_OUT }, (done) => {
      if (!done) return;
      runOnJS(setMode)(next);
      opacity.value = withTiming(1, { duration: FADE_IN });
    });
  };

  const finish = () => router.replace('/(tabs)/bank');

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {mode === 'welcome' && (
        <Welcome
          onStart={() => switchMode('onboard')}
          onLogin={() => switchMode('login')}
        />
      )}
      {mode === 'onboard' && (
        <OnboardWizard onExitBack={() => switchMode('welcome')} />
      )}
      {mode === 'login' && (
        <Login onBack={() => switchMode('welcome')} onSuccess={finish} />
      )}
    </Animated.View>
  );
}
