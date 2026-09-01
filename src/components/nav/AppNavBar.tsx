import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { TabBar, type TabId } from '@/src/design-system/primitives/TabBar';
import { QuickActionMenu } from './QuickActionMenu';

const TAB_IDS: TabId[] = ['home', 'history', 'profile'];

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
  // Remember the last real tab so a pushed non-tab route keeps a tab lit. It
  // drives what renders, so it is state — a ref read in render blocks React
  // Compiler, and React bails out when the tab is unchanged.
  const [lastTab, setLastTab] = useState<TabId>(tabSegment ?? 'home');
  useEffect(() => {
    if (tabSegment) setLastTab(tabSegment);
  }, [tabSegment]);
  const active = tabSegment ?? lastTab;

  const handleTab = (id: TabId) => {
    if (tabSegment === id) return;
    router.replace(`/(tabs)/${id}` as never);
  };

  return (
    <>
      <TabBar active={active} tone="silver" onTab={handleTab} />
      {/* FAB only on Home — hidden on the History and Profile tabs. */}
      {active === 'home' ? <QuickActionMenu /> : null}
    </>
  );
}
