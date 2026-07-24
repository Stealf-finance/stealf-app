import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { Kicker } from '@/src/design-system/primitives/Kicker';
import { SheetShell } from '@/src/design-system/primitives/SheetShell';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export type ChoiceOption = {
  key: string;
  /** Leading icon node (e.g. a colored disc). */
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
};

export type ChoiceSection = {
  /** Uppercase kicker above the group (e.g. "Cash account"). */
  label: string;
  options: ChoiceOption[];
};

/**
 * Bottom-sheet chooser: an accent icon, title + subtitle, and a list of
 * options (icon · title · subtitle · chevron) — flat via `options`, or
 * grouped under kicker labels via `sections`. Built on the shared
 * {@link SheetShell}. Render it in a transparent-modal route and pass
 * `onClose` = router.back.
 */
export function ChoiceSheet({
  accentIcon,
  title,
  subtitle,
  options,
  sections,
  onClose,
}: {
  accentIcon: ReactNode;
  title: string;
  subtitle: string;
  options?: ChoiceOption[];
  sections?: ChoiceSection[];
  onClose: () => void;
}) {
  return (
    <SheetShell onClose={onClose}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>{accentIcon}</View>

      <Text
        style={[
          sansation,
          { fontSize: 22, fontWeight: '600', color: T.ink, textAlign: 'center' },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          sansation,
          {
            fontSize: 15,
            lineHeight: 22,
            color: T.inkDim,
            textAlign: 'center',
            marginTop: 6,
            marginBottom: 20,
          },
        ]}
      >
        {subtitle}
      </Text>

      {options?.map((o, i) => <OptionRow key={o.key} option={o} first={i === 0} />)}

      {sections?.map((s, si) => (
        <View key={s.label} style={{ marginTop: si === 0 ? 0 : 18 }}>
          <Kicker color={T.inkFaint} style={{ marginBottom: 4 }}>
            {s.label}
          </Kicker>
          {s.options.map((o, i) => (
            <OptionRow key={o.key} option={o} first={i === 0} />
          ))}
        </View>
      ))}
    </SheetShell>
  );
}

function OptionRow({ option: o, first }: { option: ChoiceOption; first: boolean }) {
  return (
    <Pressable
      onPress={o.disabled ? undefined : o.onPress}
      disabled={o.disabled}
      accessibilityRole="button"
      accessibilityLabel={o.title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: T.hairline,
        opacity: o.disabled ? 0.4 : 1,
      }}
    >
      {o.icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[sansation, { fontSize: 17, fontWeight: '600', color: T.ink }]}>
          {o.title}
        </Text>
        <Text style={[sansation, { fontSize: 14, color: T.inkDim, marginTop: 2 }]}>
          {o.subtitle}
        </Text>
      </View>
      <Icons.chevR size={18} color={T.inkFaint} />
    </Pressable>
  );
}
