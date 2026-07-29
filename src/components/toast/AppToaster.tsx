import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Toaster } from 'sonner-native';
import { Icons } from '@/src/design-system/icons';
import { T } from '@/src/design-system/tokens';

// Same chrome as the Home grid cards (BlurGlass): dark blur + 5% white veil.
// Bounded to the (definite-width) toast, so it can't spill across the screen.
function ToastBackground() {
  return (
    <BlurView
      intensity={28}
      tint="dark"
      experimentalBlurMethod="dimezisBlurView"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: 'rgba(255,255,255,0.05)' },
      ]}
    />
  );
}

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      // For top-center, `offset` replaces the safe-area inset — set it below
      // the header so the toast doesn't sit on the title.
      offset={70}
      gap={10}
      duration={3200}
      swipeToDismissDirection="up"
      // Inline cross on the right; the text sits centered between it and the icon.
      closeButton
      // Check on success, cross on error; info stays icon-less. Loading keeps
      // the default spinner (not overridden) — though tx-loading now lives in
      // the FAB, not a toast.
      icons={{
        success: <Icons.check size={18} color={T.green} strokeWidth={2.4} />,
        error: <Icons.close size={16} color={T.error} />,
        info: null,
        warning: null,
      }}
      toastOptions={{
        // A definite width is required: sonner's text container is `flex: 1`,
        // which collapses to 0 (text vanishes) if the toast is content-sized.
        backgroundComponent: <ToastBackground />,
        style: {
          width: '50%',
          alignSelf: 'center',
          borderRadius: 100,
          borderWidth: 0,
          overflow: 'hidden',
          paddingVertical: 11,
          paddingHorizontal: 18,
        },
        toastContentStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        titleStyle: {
          fontFamily: 'Sansation_700Bold',
          color: T.ink,
          fontSize: 15,
          textAlign: 'center',
        },
        descriptionStyle: {
          fontFamily: 'Sansation_400Regular',
          color: T.inkDim,
          fontSize: 13,
          textAlign: 'center',
        },
      }}
    />
  );
}
