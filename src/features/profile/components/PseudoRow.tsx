import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Icons } from '@/src/design-system/icons';
import { sansation, serif } from '@/src/design-system/typography';
import { txPalette } from '@/src/design-system/palettes';
import { T } from '@/src/design-system/tokens';
import { useUpdatePseudo } from '@/src/features/onboarding/hooks/useUpdatePseudo';

const S = txPalette('silver');

const PSEUDO_RE = /^[a-zA-Z0-9_-]+$/;

/** The `@username` line with an inline editor. Tapping the pencil swaps the
 *  label for a text field with confirm / cancel; validation mirrors the
 *  backend (3–20 chars, letters/numbers/_/-), and the "already taken" 409 is
 *  surfaced inline. */
export function PseudoRow({ username }: { username: string }) {
  const { mutateAsync, isPending } = useUpdatePseudo();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setValue(username);
    setError(null);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(null);
  };
  const submit = async () => {
    const next = value.trim();
    if (next === username) return cancel();
    if (next.length < 3 || next.length > 20) {
      setError('3–20 characters');
      return;
    }
    if (!PSEUDO_RE.test(next)) {
      setError('Letters, numbers, _ and - only');
      return;
    }
    try {
      await mutateAsync(next);
      setEditing(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update username');
    }
  };

  if (!editing) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Text
          style={[
            serif,
            { fontStyle: 'italic', fontSize: 30, lineHeight: 33, color: S.ink },
          ]}
        >
          {username ? `@${username}` : '—'}
        </Text>
        <Pressable
          onPress={open}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Edit username"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Icons.pencil size={15} color={S.inkFaint} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderColor: 'rgba(230,230,235,0.22)',
            paddingBottom: 2,
          }}
        >
          <Text
            style={[
              serif,
              { fontStyle: 'italic', fontSize: 26, color: S.inkDim },
            ]}
          >
            @
          </Text>
          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t);
              if (error) setError(null);
            }}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            editable={!isPending}
            returnKeyType="done"
            onSubmitEditing={submit}
            selectionColor={S.accent}
            style={[
              serif,
              {
                fontStyle: 'italic',
                fontSize: 26,
                color: S.ink,
                minWidth: 110,
                padding: 0,
                includeFontPadding: false,
              },
            ]}
          />
        </View>

        {isPending ? (
          <ActivityIndicator size="small" color={S.accent} />
        ) : (
          <>
            <Pressable
              onPress={submit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Save username"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Icons.check size={18} color={T.green} strokeWidth={2.4} />
            </Pressable>
            <Pressable
              onPress={cancel}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Icons.close size={18} color={S.inkFaint} />
            </Pressable>
          </>
        )}
      </View>

      {error ? (
        <Text
          style={[
            sansation,
            {
              marginTop: 8,
              fontSize: 11,
              color: T.error,
              includeFontPadding: false,
            },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
