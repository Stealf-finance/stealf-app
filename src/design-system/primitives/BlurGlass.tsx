import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

type Props = {
  /** Radius lives on the static outer View (clips the blur to rounded
   *  corners — RN won't apply borderRadius to BlurView reliably). Use 22
   *  for cards, 100 for pills. */
  radius: number;
  /** Optional override; defaults to the codebase-wide intensity = 28. */
  intensity?: number;
  /** Optional override; defaults to 'rgba(255,255,255,0.05)'. */
  bgColor?: string;
  /** Inner content + layout props (padding, flexDirection, alignItems, gap…) */
  innerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// Why this exists despite only 2 callers today:
// Two cards on the Home screen (GetBankAccountCard, BankClaimButton) ship
// the exact same BlurView config — intensity 28, dimezisBlurView,
// dark tint, rgba(255,255,255,0.05) bg, wrapped in an overflow:'hidden'
// View for radius clipping. The drift was already starting (radius 22 vs
// 100; padding diverged). The wider "GlassCard absorbs 9 cards" plan
// was rage-quit per the brief — the other 7 candidates each have unique
// borders, shadows, gradient stops, or inset highlights that don't
// generalize. This narrow primitive locks the BlurView recipe so the
// next blur card doesn't have to copy a 3-layer View dance.
export function BlurGlass({
  radius,
  intensity = 28,
  bgColor = 'rgba(255,255,255,0.05)',
  innerStyle,
  children,
}: Props) {
  return (
    <View style={{ borderRadius: radius, overflow: 'hidden' }}>
      <BlurView
        intensity={intensity}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[{ backgroundColor: bgColor }, innerStyle]}
      >
        {children}
      </BlurView>
    </View>
  );
}
