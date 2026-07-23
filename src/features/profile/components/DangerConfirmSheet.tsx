import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

export type DangerBullet = { iconKey: keyof typeof Icons; text: string };

type Props = {
  visible: boolean;
  /** Red badge icon at the top. */
  iconKey: keyof typeof Icons;
  title: string;
  bullets: DangerBullet[];
  checkboxLabel: string;
  ctaLabel: string;
  /** Shown on the CTA while `busy`. */
  busyLabel?: string;
  /** Red CTA (delete) instead of the neutral glass one. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Centered danger-confirmation dialog — shared by the export and
 *  delete-wallet sheets. Blurred backdrop + opaque #0d0d0d panel (the
 *  receive-qr / MoveConfirm recipe), acknowledge checkbox gating the CTA. */
export function DangerConfirmSheet({
  visible,
  iconKey,
  title,
  bullets,
  checkboxLabel,
  ctaLabel,
  busyLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [acknowledged, setAcknowledged] = useState(false);
  const BadgeIcon = Icons[iconKey];

  // Reset checkbox each time the sheet closes.
  const handleClose = () => {
    if (busy) return;
    setAcknowledged(false);
    onCancel();
  };

  const handleConfirm = () => {
    if (!acknowledged || busy) return;
    setAcknowledged(false);
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,10,0.5)' }]}
        />
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
        />

        {/* Panel — opaque, Home-cards color */}
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            backgroundColor: '#0d0d0d',
            paddingTop: 32,
            paddingHorizontal: 24,
            paddingBottom: 24,
            gap: 20,
          }}
        >
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            disabled={busy}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <Icons.close size={22} color={T.ink} strokeWidth={1.6} />
          </Pressable>

          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(229,72,77,0.92)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BadgeIcon size={30} color="#fff" strokeWidth={1.8} />
            </View>
          </View>

          <Text
            style={[
              serif,
              {
                fontSize: 24,
                lineHeight: 30,
                color: T.ink,
                textAlign: 'center',
                fontStyle: 'italic',
                paddingHorizontal: 8,
              },
            ]}
          >
            {title}
          </Text>

          <View style={{ gap: 14 }}>
            {bullets.map((b) => (
              <Bullet key={b.text} iconKey={b.iconKey} text={b.text} />
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />

          <Pressable
            onPress={() => setAcknowledged((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            accessibilityLabel={checkboxLabel}
            disabled={busy}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: acknowledged ? T.ink : 'rgba(255,255,255,0.20)',
                backgroundColor: acknowledged ? T.ink : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {acknowledged ? (
                <Icons.check size={14} color="#0a0a0a" strokeWidth={2.6} />
              ) : null}
            </View>
            <Text
              style={[
                sansation,
                { flex: 1, fontSize: 13, lineHeight: 18, color: T.ink },
              ]}
            >
              {checkboxLabel}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
            disabled={!acknowledged || busy}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }) => ({
              width: '100%',
              paddingVertical: 12,
              borderRadius: 100,
              backgroundColor: destructive
                ? acknowledged
                  ? 'rgba(229,72,77,0.92)'
                  : 'rgba(229,72,77,0.30)'
                : 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: destructive
                ? 'rgba(229,72,77,0.60)'
                : 'rgba(255,255,255,0.10)',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={[
                sansation,
                {
                  textAlign: 'center',
                  fontSize: 11,
                  letterSpacing: 2.4,
                  textTransform: 'uppercase',
                  color: destructive ? '#fff' : T.ink,
                  fontWeight: '700',
                  opacity: destructive || acknowledged ? 1 : 0.4,
                },
              ]}
            >
              {busy ? busyLabel ?? ctaLabel : ctaLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({ iconKey, text }: DangerBullet) {
  const Icon = Icons[iconKey];
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: 'rgba(229,72,77,0.85)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={14} color="#fff" strokeWidth={1.8} />
      </View>
      <Text
        style={[
          sansation,
          { flex: 1, fontSize: 12, lineHeight: 17, color: T.ink },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}
