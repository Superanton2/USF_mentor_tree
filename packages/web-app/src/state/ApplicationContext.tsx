import type { GraphIndex, GraphMember } from '@mentor-tree/domain';
import { createContext, useCallback, useContext, useMemo, type Dispatch } from 'react';
import { TRANSLATIONS, type Translations } from '../locales';
import type { ApplicationAction, ApplicationState } from './applicationState';

interface ApplicationContextValue {
  state: ApplicationState;
  dispatch: Dispatch<ApplicationAction>;
  index: GraphIndex;
}

export const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export function useApplication(): ApplicationContextValue {
  const value = useContext(ApplicationContext);
  if (value === null) throw new Error('useApplication must be used inside ApplicationContext');
  return value;
}

export function useTranslations(): Translations {
  return TRANSLATIONS[useApplication().state.language];
}

/** Explicit selection actions; components never build reducer actions by hand. */
export function useSelectionActions() {
  const { dispatch, index } = useApplication();
  const selectMember = useCallback(
    (memberId: string) => {
      const member = index.membersById.get(memberId);
      if (member) dispatch({ type: 'memberSelected', memberId, treeId: member.treeId });
    },
    [dispatch, index],
  );
  const clearSelection = useCallback(() => dispatch({ type: 'selectionCleared' }), [dispatch]);
  return useMemo(() => ({ selectMember, clearSelection }), [selectMember, clearSelection]);
}

export function getDisplayName(member: GraphMember, translations: Translations): string {
  return member.fullName ?? translations.hiddenMemberName;
}
