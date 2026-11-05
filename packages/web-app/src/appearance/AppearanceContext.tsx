import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { MemberStyle } from '../graph/GraphRenderer';
import { useApplication } from '../state/ApplicationContext';
import { buildMemberStyles } from './memberAppearance';

const AppearanceContext = createContext<Map<string, MemberStyle> | null>(null);

/** Fill colors and filter matches for the current settings, shared by the graph, lineage and legend. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { index, state } = useApplication();
  const memberStyles = useMemo(
    () => buildMemberStyles(index, state.settings),
    [index, state.settings],
  );
  return <AppearanceContext.Provider value={memberStyles}>{children}</AppearanceContext.Provider>;
}

export function useMemberStyles(): Map<string, MemberStyle> {
  const memberStyles = useContext(AppearanceContext);
  if (memberStyles === null)
    throw new Error('useMemberStyles must be used inside AppearanceProvider');
  return memberStyles;
}
