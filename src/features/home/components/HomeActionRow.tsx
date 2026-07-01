import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SquareActionTile } from '@/src/design-system/primitives/SquareActionTile';
import { useToast } from '@/src/components/toast/ToastContext';
import { homeCardActions, type HomeCardId } from '../lib/homeCardActions';

/**
 * One page of the tiles slider: the action tiles for a given card.
 * `total` has no actions → an empty, height-matched page so the slider stays
 * aligned with the balance slider.
 */
export function HomeActionRow({ card }: { card: HomeCardId }) {
  const router = useRouter();
  const { show } = useToast();
  const actions = homeCardActions(card);
  const gold = card === 'encrypted';
  return (
    <View style={{ flexDirection: 'row', gap: 8, minHeight: 76 }}>
      {actions.map((a) => (
        <SquareActionTile
          key={a.key}
          iconKey={a.iconKey}
          label={a.label}
          accent={gold && a.key === 'send'}
          accentTone={gold ? 'gold' : 'silver'}
          onPress={() =>
            a.comingSoon || !a.route
              ? show({
                  kind: 'info',
                  title: 'Coming soon',
                  message: `${a.label} is coming soon.`,
                })
              : router.push(a.route as never)
          }
        />
      ))}
    </View>
  );
}
