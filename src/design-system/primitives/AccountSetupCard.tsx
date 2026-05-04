import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icons } from '@/src/design-system/icons';
import {
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';

type Kind = 'stealth' | 'bank';

type Props = {
  kind?: Kind;
  insufficient?: boolean;
  onPress?: () => void;
  loading?: boolean;
};

const COPY: Record<
  Kind,
  {
    kicker: string;
    title: string;
    titleEm: string;
    body: [string, string, string];
    cta: string;
    insufficientTitle: string;
    insufficientTitleEm: string;
    insufficientBody: [string, string, string];
    ctaInsufficient: string;
    cost: string;
  }
> = {
  stealth: {
    kicker: 'wallets · not initialized',
    title: 'Register your',
    titleEm: 'accounts',
    body: [
      'Required to use ',
      'private balances',
      ' and move funds privately on Stealf.',
    ],
    cta: 'Register now',
    insufficientTitle: 'Insufficient',
    insufficientTitleEm: 'SOL',
    insufficientBody: [
      'More SOL is required on your wallets to register your ',
      'accounts',
      ' on Stealf.',
    ],
    ctaInsufficient: 'Go back',
    cost: '~0.024 SOL',
  },
  bank: {
    kicker: 'bank account · not yet activated',
    title: 'Activate your',
    titleEm: 'cash account',
    body: [
      'Required to receive a personal ',
      'EUR IBAN',
      ' and pay anywhere with your Stealf card.',
    ],
    cta: 'Activate bank account',
    insufficientTitle: 'Verification',
    insufficientTitleEm: 'required',
    insufficientBody: [
      'Complete KYC to activate your ',
      'cash account',
      ' and receive a personal IBAN.',
    ],
    ctaInsufficient: 'Start verification',
    cost: 'Free · 60 seconds',
  },
};

const ACCENTS: Record<Kind, { accent: string; faint: string; gradient: [string, string]; glow: string }> = {
  stealth: {
    accent: '#e6c079',
    faint: 'rgba(230,192,121,0.14)',
    gradient: ['#e6c079', '#a37b2e'],
    glow: 'rgba(230,192,121,0.35)',
  },
  bank: {
    accent: '#c9c9cc',
    faint: 'rgba(201,201,204,0.14)',
    gradient: ['#e8e8ea', '#9a9a9f'],
    glow: 'rgba(220,220,225,0.2)',
  },
};

export function AccountSetupCard({
  kind = 'stealth',
  insufficient = false,
  onPress,
  loading = false,
}: Props) {
  const copy = COPY[kind];
  const tones = ACCENTS[kind];

  const titleText = insufficient ? copy.insufficientTitle : copy.title;
  const titleEmText = insufficient ? copy.insufficientTitleEm : copy.titleEm;
  const body = insufficient ? copy.insufficientBody : copy.body;
  const ctaText = insufficient ? copy.ctaInsufficient : copy.cta;

  return (
    <View
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 20 },
      }}
    >
      <LinearGradient
        colors={['rgba(22,22,24,0.95)', 'rgba(10,10,12,0.98)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ padding: 24 }}
      >
        {/* top sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

      <Text
        style={[
          sansation,
          {
            fontSize: 9,
            letterSpacing: 2.52,
            textTransform: 'uppercase',
            color: tones.accent,
            fontWeight: '700',
            marginBottom: 12,
          },
        ]}
      >
        {copy.kicker}
      </Text>

      <Text
        style={[
          sansationLight,
          {
            fontSize: 26,
            color: T.ink,
            letterSpacing: -0.65,
            lineHeight: 30,
            marginBottom: 22,
          },
        ]}
      >
        {titleText}{' '}
        <Text
          style={[
            serif,
            {
              fontStyle: 'italic',
              color: tones.accent,
            },
          ]}
        >
          {titleEmText}
        </Text>
      </Text>

      <Text
        style={[
          sansation,
          {
            fontSize: 14,
            color: T.inkDim,
            lineHeight: 22,
            marginBottom: 22,
          },
        ]}
      >
        {body[0]}
        <Text
          style={[
            serif,
            { fontStyle: 'italic', color: tones.accent },
          ]}
        >
          {body[1]}
        </Text>
        {body[2]}
      </Text>

      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={ctaText}
        style={({ pressed }) => ({
          width: '100%',
          borderRadius: 28,
          overflow: 'hidden',
          opacity: loading ? 0.6 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
          shadowColor: insufficient ? '#000' : tones.glow,
          shadowOpacity: insufficient ? 0.4 : 1,
          shadowRadius: insufficient ? 12 : 22,
          shadowOffset: { width: 0, height: insufficient ? 6 : 10 },
        })}
      >
        <View
          style={{
            paddingVertical: 18,
            paddingHorizontal: 22,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: insufficient
              ? 'rgba(255,255,255,0.14)'
              : 'rgba(255,255,255,0.35)',
            backgroundColor: insufficient ? 'rgba(255,255,255,0.04)' : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            overflow: 'hidden',
          }}
        >
          {!insufficient ? (
            <>
              <LinearGradient
                colors={tones.gradient}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              {/* inset top highlight — gives the gloss */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          ) : null}
          <Text
            style={[
              sansation,
              {
                fontSize: 12,
                letterSpacing: 2.6,
                textTransform: 'uppercase',
                fontWeight: '700',
                color: insufficient ? T.ink : '#0a0a0a',
              },
            ]}
          >
            {ctaText}
          </Text>
          {!insufficient ? (
            <Icons.arrRight size={14} color="#0a0a0a" strokeWidth={2.2} />
          ) : null}
        </View>
      </Pressable>

      {!insufficient ? (
        <Text
          style={[
            sansation,
            {
              marginTop: 10,
              textAlign: 'center',
              fontSize: 10.5,
              color: T.inkFaint,
              letterSpacing: 0.4,
              lineHeight: 16,
            },
          ]}
        >
          {kind === 'stealth' ? 'One-time setup · ' : 'Setup · '}
          <Text style={[serif, { fontStyle: 'italic', color: T.inkDim, fontSize: 12 }]}>
            {copy.cost}
          </Text>
          {kind === 'stealth' ? ' network fee' : ' to verify'}
        </Text>
      ) : null}
      </LinearGradient>
    </View>
  );
}
