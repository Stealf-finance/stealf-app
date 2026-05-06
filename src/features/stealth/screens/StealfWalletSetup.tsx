import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CenterGlow } from '@/src/design-system/primitives/CenterGlow';
import { PillBtn } from '@/src/design-system/primitives/PillBtn';
import { BackBtn } from '@/src/design-system/primitives/BackBtn';
import { LoaderOverlay } from '@/src/design-system/primitives/LoaderOverlay';
import { Icons } from '@/src/design-system/icons';
import {
  mono,
  sansation,
  sansationLight,
  serif,
} from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { validateMnemonic } from '@/src/services/solana/transactionsGuard';

const G = txPalette('silver');

const WORD_COUNT = 12;
const TONE = 'silver' as const;

export type SetupChoice =
  | { mode: 'create' }
  | { mode: 'import'; mnemonic: string };

type Step = 'choose' | 'showMnemonic' | 'importWallet';

type Props = {
  onComplete: (choice: SetupChoice) => void;
  onCancel?: () => void;
  loading: boolean;
  generatedMnemonic?: string;
};

export function StealfWalletSetup({
  onComplete,
  onCancel,
  loading,
  generatedMnemonic,
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(
    generatedMnemonic ? 'showMnemonic' : 'choose',
  );
  const [words, setWords] = useState<string[]>(() =>
    Array(WORD_COUNT).fill(''),
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wordRefs = useRef<Array<TextInput | null>>([]);
  const clipboardTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (generatedMnemonic) setStep('showMnemonic');
  }, [generatedMnemonic]);

  useEffect(() => () => {
    if (clipboardTimeout.current) clearTimeout(clipboardTimeout.current);
  }, []);

  const setWordAt = (i: number, raw: string) => {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length > 1) {
      setWords((prev) => {
        const next = [...prev];
        for (let k = 0; k < parts.length && i + k < WORD_COUNT; k++) {
          next[i + k] = parts[k].toLowerCase();
        }
        return next;
      });
      if (importError) setImportError(null);
      const nextIndex = Math.min(i + parts.length, WORD_COUNT - 1);
      wordRefs.current[nextIndex]?.focus();
      return;
    }
    setWords((prev) => {
      const next = [...prev];
      next[i] = raw.toLowerCase();
      return next;
    });
    if (importError) setImportError(null);
  };

  const handleCopyMnemonic = async () => {
    if (!generatedMnemonic) return;
    await Clipboard.setStringAsync(generatedMnemonic);
    setCopied(true);
    if (clipboardTimeout.current) clearTimeout(clipboardTimeout.current);
    clipboardTimeout.current = setTimeout(async () => {
      const current = await Clipboard.getStringAsync();
      if (current === generatedMnemonic) {
        await Clipboard.setStringAsync('');
      }
      setCopied(false);
    }, 30_000);
  };

  const handleConfirmCreate = () => {
    Alert.alert(
      'Confirm',
      "Have you saved your recovery phrase? You won't be able to see it again.",
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, continue',
          onPress: () => onComplete({ mode: 'create' }),
        },
      ],
    );
  };

  const handleSubmitImport = () => {
    Keyboard.dismiss();
    const mnemonic = words.map((w) => w.trim().toLowerCase()).join(' ');
    const result = validateMnemonic(mnemonic);
    if (!result.valid) {
      setImportError(result.error ?? 'Invalid seed phrase');
      return;
    }
    setImportError(null);
    onComplete({ mode: 'import', mnemonic });
  };

  const importComplete = words.every((w) => w.trim() !== '');

  return (
    <CenterGlow tone={TONE}>
      <View
        style={{
          paddingTop: insets.top + 24,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {step === 'choose' ? (
          <View style={{ width: 36 }} />
        ) : (
          <BackBtn
            onPress={() => {
              if (step === 'importWallet') {
                setWords(Array(WORD_COUNT).fill(''));
                setImportError(null);
              }
              setStep('choose');
              onCancel?.();
            }}
          />
        )}
        <Text
          style={[
            serif,
            {
              flex: 1,
              textAlign: 'center',
              fontSize: 17,
              color: T.ink,
              includeFontPadding: false,
              marginRight: 36,
            },
          ]}
        >
          Stealth wallet
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {step === 'choose' ? (
          <Animated.View key="choose" entering={FadeIn.duration(280)}>
            <ChooseStep
              loading={loading}
              onComplete={onComplete}
              setStep={setStep}
            />
          </Animated.View>
        ) : null}

        {step === 'showMnemonic' && generatedMnemonic ? (
          <Animated.View key="showMnemonic" entering={FadeIn.duration(320)}>
            <ShowMnemonicStep
              mnemonic={generatedMnemonic}
              copied={copied}
              onCopy={handleCopyMnemonic}
              onConfirm={handleConfirmCreate}
              loading={loading}
            />
          </Animated.View>
        ) : null}

        {step === 'importWallet' ? (
          <Animated.View key="importWallet" entering={FadeIn.duration(280)}>
            <ImportStep
              words={words}
              wordRefs={wordRefs}
              onWordChange={setWordAt}
              onSubmit={handleSubmitImport}
              error={importError}
              loading={loading}
              disabled={!importComplete}
            />
          </Animated.View>
        ) : null}
      </ScrollView>

      {loading ? (
        <LoaderOverlay
          tone={TONE}
          label={
            step === 'importWallet'
              ? 'Restoring your wallet…'
              : step === 'showMnemonic'
                ? 'Setting up your stealth wallet…'
                : 'Generating wallet…'
          }
          sub="This can take a moment. Hang tight."
        />
      ) : null}
    </CenterGlow>
  );
}

type ChooseProps = {
  loading: boolean;
  onComplete: (choice: SetupChoice) => void;
  setStep: (s: Step) => void;
};

function ChooseStep({ loading, onComplete, setStep }: ChooseProps) {
  return (
    <View style={{ paddingTop: 16 }}>
      <Text
        style={[
          sansation,
          {
            fontSize: 9,
            letterSpacing: 2.52,
            textTransform: 'uppercase',
            color: G.accent,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 12,
          },
        ]}
      >
        Get started
      </Text>
      <Text
        style={[
          sansationLight,
          {
            fontSize: 28,
            color: T.ink,
            textAlign: 'center',
            letterSpacing: -0.84,
            marginBottom: 10,
          },
        ]}
      >
        Set up your stealth wallet
      </Text>
      <Text
        style={[
          serif,
          {
            fontSize: 15,
            fontStyle: 'italic',
            color: T.inkDim,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 36,
          },
        ]}
      >
        Create a new wallet or restore one with your recovery phrase.
      </Text>

      <SetupOption
        iconKey="plus"
        label="Create new wallet"
        sub="Generate a brand new wallet"
        onPress={() => onComplete({ mode: 'create' })}
        disabled={loading}
      />
      <View style={{ height: 12 }} />
      <SetupOption
        iconKey="key"
        label="Import wallet"
        sub="Use an existing recovery phrase"
        onPress={() => setStep('importWallet')}
        disabled={loading}
      />
    </View>
  );
}

type SetupOptionProps = {
  iconKey: 'plus' | 'key';
  label: string;
  sub: string;
  onPress: () => void;
  disabled?: boolean;
};

function SetupOption({ iconKey, label, sub, onPress, disabled }: SetupOptionProps) {
  const Icon = iconKey === 'plus' ? Icons.plus : Icons.key;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.015)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 18,
          paddingHorizontal: 18,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: G.hairline,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={G.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              sansation,
              { fontSize: 15, color: T.ink, includeFontPadding: false },
            ]}
          >
            {label}
          </Text>
          <Text
            style={[
              sansation,
              {
                fontSize: 11,
                color: T.inkFaint,
                marginTop: 3,
                includeFontPadding: false,
              },
            ]}
          >
            {sub}
          </Text>
        </View>
        <Icons.chevR size={14} color={T.inkFaint} />
      </LinearGradient>
    </Pressable>
  );
}

type ShowMnemonicProps = {
  mnemonic: string;
  copied: boolean;
  onCopy: () => void;
  onConfirm: () => void;
  loading: boolean;
};

function ShowMnemonicStep({
  mnemonic,
  copied,
  onCopy,
  onConfirm,
  loading,
}: ShowMnemonicProps) {
  const wordsArr = mnemonic.trim().split(/\s+/);
  const [revealed, setRevealed] = useState(false);
  const EyeIcon = revealed ? Icons.hideEye : Icons.eye;
  const displayWords = revealed
    ? wordsArr
    : Array(WORD_COUNT).fill('******');
  return (
    <View style={{ paddingTop: 8 }}>
      <Text
        style={[
          sansation,
          {
            fontSize: 9,
            letterSpacing: 2.52,
            textTransform: 'uppercase',
            color: G.accent,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 12,
          },
        ]}
      >
        Recovery phrase
      </Text>
      <Text
        style={[
          sansationLight,
          {
            fontSize: 26,
            color: T.ink,
            textAlign: 'center',
            letterSpacing: -0.78,
            marginBottom: 10,
          },
        ]}
      >
        Save these 12 words
      </Text>
      <Text
        style={[
          serif,
          {
            fontSize: 14,
            fontStyle: 'italic',
            color: T.inkDim,
            textAlign: 'center',
            lineHeight: 21,
            paddingHorizontal: 12,
            marginBottom: 28,
          },
        ]}
      >
        Anyone with these words owns the wallet. Write them down somewhere
        safe — we can't recover them for you.
      </Text>

      <View
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: G.hairline,
          marginBottom: 16,
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            paddingTop: 18,
            paddingBottom: 18,
            paddingLeft: 14,
            paddingRight: 44,
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {displayWords.map((w, i) => (
            <View
              key={i}
              style={{
                width: '33.333%',
                paddingHorizontal: 4,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 10,
                    color: T.inkFaint,
                    width: 16,
                    textAlign: 'right',
                  },
                ]}
              >
                {i + 1}
              </Text>
              <Text
                style={[
                  mono,
                  { fontSize: 13, color: T.ink, includeFontPadding: false },
                ]}
              >
                {w}
              </Text>
            </View>
          ))}
        </LinearGradient>
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? 'Hide recovery phrase' : 'Reveal recovery phrase'
            }
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <EyeIcon size={18} color={T.ink} strokeWidth={1.6} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel="Copy recovery phrase"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 12,
          marginBottom: 24,
        }}
      >
        {copied ? (
          <Icons.check size={14} color={G.accent} />
        ) : (
          <Icons.copy size={14} color={T.inkDim} />
        )}
        <Text
          style={[
            sansation,
            {
              fontSize: 11,
              letterSpacing: 2.42,
              textTransform: 'uppercase',
              fontWeight: '700',
              color: copied ? G.accent : T.inkDim,
            },
          ]}
        >
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </Pressable>

      <PillBtn
        variant="primary"
        tone={TONE}
        label={loading ? 'Saving…' : "I've saved my recovery phrase"}
        disabled={loading}
        onPress={onConfirm}
      />
    </View>
  );
}

type ImportStepProps = {
  words: string[];
  wordRefs: React.MutableRefObject<Array<TextInput | null>>;
  onWordChange: (i: number, value: string) => void;
  onSubmit: () => void;
  error: string | null;
  loading: boolean;
  disabled: boolean;
};

function ImportStep({
  words,
  wordRefs,
  onWordChange,
  onSubmit,
  error,
  loading,
  disabled,
}: ImportStepProps) {
  return (
    <View style={{ paddingTop: 8 }}>
      <Text
        style={[
          sansation,
          {
            fontSize: 9,
            letterSpacing: 2.52,
            textTransform: 'uppercase',
            color: G.accent,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 12,
          },
        ]}
      >
        Restore wallet
      </Text>
      <Text
        style={[
          sansationLight,
          {
            fontSize: 26,
            color: T.ink,
            textAlign: 'center',
            letterSpacing: -0.78,
            marginBottom: 10,
          },
        ]}
      >
        Enter your recovery phrase
      </Text>
      <Text
        style={[
          serif,
          {
            fontSize: 14,
            fontStyle: 'italic',
            color: T.inkDim,
            textAlign: 'center',
            lineHeight: 21,
            marginBottom: 28,
          },
        ]}
      >
        Type or paste your 12 words below.
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -4,
        }}
      >
        {words.map((value, i) => (
          <View
            key={i}
            style={{ width: '33.333%', paddingHorizontal: 4, paddingBottom: 8 }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: error ? '#E5484D' : G.hairline,
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Text
                style={[
                  sansation,
                  {
                    fontSize: 10,
                    color: T.inkFaint,
                    width: 14,
                  },
                ]}
              >
                {i + 1}
              </Text>
              <TextInput
                ref={(ref) => {
                  wordRefs.current[i] = ref;
                }}
                value={value}
                onChangeText={(t) => onWordChange(i, t)}
                onSubmitEditing={() => {
                  if (i < WORD_COUNT - 1) wordRefs.current[i + 1]?.focus();
                  else onSubmit();
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                returnKeyType={i === WORD_COUNT - 1 ? 'done' : 'next'}
                editable={!loading}
                style={[
                  mono,
                  {
                    flex: 1,
                    paddingVertical: 0,
                    fontSize: 13,
                    color: T.ink,
                  },
                ]}
                accessibilityLabel={`Word ${i + 1}`}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={{ minHeight: 22, marginTop: 10, marginBottom: 8 }}>
        {error ? (
          <Text
            style={[
              sansation,
              { fontSize: 12, color: '#E5484D', textAlign: 'center' },
            ]}
          >
            {error}
          </Text>
        ) : null}
      </View>

      <PillBtn
        variant="primary"
        tone={TONE}
        label={loading ? 'Importing…' : 'Import wallet'}
        disabled={disabled || loading}
        onPress={onSubmit}
      />
    </View>
  );
}
