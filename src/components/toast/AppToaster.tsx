import { ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import { Toaster } from 'sonner-native';
import { isOpPending } from '@/src/components/pending-ops/PendingOpsContext';
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

// Every icon gets the same box — the spinner's own 20x20 — so swapping it for
// the outcome icon never resizes the row or shifts the text off centre.
const ICON_BOX = 20;

function IconSlot({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        width: ICON_BOX,
        height: ICON_BOX,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

// iOS hoists toasts into a window-level overlay so they clear native modals.
// That overlay sits outside the app's gesture root, which leaves the toast's
// swipe handler rootless and swallowing every touch in the app — hence a root
// of its own, box-none so only the toast itself is touchable.
function ToasterOverlay({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'ios') return <>{children}</>;
  return (
    <FullWindowOverlay>
      <GestureHandlerRootView
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
      >
        {children}
      </GestureHandlerRootView>
    </FullWindowOverlay>
  );
}

// A toast's own root is a full-width band that swallows touches at its height —
// right over the header. Fine for one that clears itself in seconds; not for an
// op spinner that outlives a proof, so that one is rendered touch-through.
function ToastLayer({
  toastId,
  children,
}: {
  toastId: string | number;
  children: ReactNode;
}) {
  return (
    <View
      pointerEvents={isOpPending(toastId) ? 'none' : 'box-none'}
      style={{ width: '100%' }}
    >
      {children}
    </View>
  );
}

export function AppToaster() {
  return (
    <Toaster
      ToasterOverlayWrapper={ToasterOverlay}
      ToastWrapper={ToastLayer}
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
      // Check on success, cross on error; info stays icon-less. Loading is the
      // in-flight indicator for a transaction, so it takes the toast ink.
      icons={{
        success: (
          <IconSlot>
            <Icons.check size={18} color={T.green} strokeWidth={2.4} />
          </IconSlot>
        ),
        error: (
          <IconSlot>
            <Icons.close size={16} color={T.error} />
          </IconSlot>
        ),
        loading: (
          <IconSlot>
            <ActivityIndicator size="small" color={T.ink} />
          </IconSlot>
        ),
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
