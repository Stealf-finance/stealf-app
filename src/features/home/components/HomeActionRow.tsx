import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SquareActionTile } from '@/src/design-system/primitives/SquareActionTile';
import { homeCardActions, type HomeCardId } from '../lib/homeCardActions';

export function HomeActionRow({ card }: { card: HomeCardId }) {
  const router = useRouter();
  const actions = homeCardActions(card);
  if (actions.length === 0) return null;
  const accent = card === 'encrypted';
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 18 }}>
      {actions.map((a) => (
        <View key={a.key} style={{ flex: 1 }}>
          <SquareActionTile
            iconKey={a.iconKey}
            label={a.label}
            accent={accent}
            accentTone={accent ? 'gold' : 'silver'}
            onPress={() => router.push(a.route as never)}
          />
        </View>
      ))}
    </View>
  );
}
