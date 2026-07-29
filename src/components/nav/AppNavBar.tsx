import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { TabBar, type TabId } from '@/src/design-system/primitives/TabBar';
import { QuickActionMenu } from './QuickActionMenu';

const TAB_IDS: TabId[] = ['bank', 'history', 'profile'];

/**
 * The app's bottom navigation — the pill TabBar (Home / History / Profile) plus
 * the "+" QuickActionMenu FAB. Rendered by the tabs layout AND by pushed
 * wallet-detail screens so the nav stays present there too. Derives the active
 * tab from the route segments; on a non-tab route the last visited tab stays lit.
 */
export function AppNavBar() {
  const router = useRouter();
  const segments = useSegments();

  const tabSegment = segments.find((s) => TAB_IDS.includes(s as TabId)) as
    | TabId
    | undefined;
  // Remember the last real tab so a pushed non-tab route keeps a tab lit.
  // Held in a ref (mutated in an effect, read during render) rather than
  // state+effect, which would fire an extra render on every tab change.
  const lastTabRef = useRef<TabId>(tabSegment ?? 'bank');
  useEffect(() => {
    if (tabSegment) lastTabRef.current = tabSegment;
  }, [tabSegment]);
  const active = tabSegment ?? lastTabRef.current;

  const handleTab = (id: TabId) => {
    if (tabSegment === id) return;
    router.replace(`/(tabs)/${id}` as never);
  };

  return (
    <>
      <TabBar active={active} tone="silver" onTab={handleTab} />
      {/* FAB only on Home — hidden on the History and Profile tabs. */}
      {active === 'bank' ? <QuickActionMenu /> : null}
    </>
  );
}
