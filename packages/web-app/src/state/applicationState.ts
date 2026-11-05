import type { GraphIndex } from '@mentor-tree/domain';
import type { Language } from '../locales';
import type { RouteRequest, ViewMode } from '../routing/locationRouting';
import { DEFAULT_USER_SETTINGS, type UserSettings } from '../settings/userSettings';

export type ApplicationNotice = 'treeNotFound';

export type PanelName = 'settings' | 'largestTrees';

/** What the address bar determines; the rest of the state belongs to the visitor's session. */
export interface RouteSelection {
  language: Language;
  selectedTreeId: string | null;
  selectedMemberId: string | null;
  view: ViewMode;
  notice: ApplicationNotice | null;
}

export interface ApplicationState extends RouteSelection {
  settings: UserSettings;
  openPanel: PanelName | null;
}

export type ApplicationAction =
  | { type: 'locationRestored'; route: RouteSelection }
  | { type: 'memberSelected'; memberId: string; treeId: string | null }
  | { type: 'treeSelected'; treeId: string }
  | { type: 'selectionCleared' }
  | { type: 'languageChanged'; language: Language }
  | { type: 'viewChanged'; view: ViewMode }
  | { type: 'settingsChanged'; changes: Partial<UserSettings> }
  | { type: 'settingsReset' }
  | { type: 'panelOpened'; panel: PanelName }
  | { type: 'panelClosed' }
  | { type: 'noticeDismissed' };

export function createInitialState(
  language: Language,
  settings: UserSettings = DEFAULT_USER_SETTINGS,
): ApplicationState {
  return {
    language,
    selectedTreeId: null,
    selectedMemberId: null,
    view: 'graph',
    notice: null,
    settings,
    openPanel: null,
  };
}

export function applicationReducer(
  state: ApplicationState,
  action: ApplicationAction,
): ApplicationState {
  switch (action.type) {
    case 'locationRestored':
      return { ...state, ...action.route };
    case 'memberSelected':
      return {
        ...state,
        selectedMemberId: action.memberId,
        selectedTreeId: action.treeId,
        notice: null,
      };
    case 'treeSelected':
      return { ...state, selectedTreeId: action.treeId, selectedMemberId: null, notice: null };
    case 'selectionCleared':
      return {
        ...state,
        selectedTreeId: null,
        selectedMemberId: null,
        view: 'graph',
        notice: null,
      };
    case 'languageChanged':
      return { ...state, language: action.language };
    case 'viewChanged':
      return state.selectedTreeId === null && action.view === 'lineage'
        ? state
        : { ...state, view: action.view };
    case 'settingsChanged':
      return { ...state, settings: { ...state.settings, ...action.changes } };
    case 'settingsReset':
      return { ...state, settings: DEFAULT_USER_SETTINGS };
    case 'panelOpened':
      return { ...state, openPanel: action.panel };
    case 'panelClosed':
      return { ...state, openPanel: null };
    case 'noticeDismissed':
      return { ...state, notice: null };
  }
}

/** Turns what the URL asks for into a state that is guaranteed to exist in the data. */
export function resolveRouteAgainstData(request: RouteRequest, index: GraphIndex): RouteSelection {
  const base: RouteSelection = {
    language: request.language,
    selectedTreeId: null,
    selectedMemberId: null,
    view: 'graph',
    notice: null,
  };
  const treeFromPath = request.treeId;
  const isTreeUnknown = treeFromPath !== null && !index.treesById.has(treeFromPath);
  const member = request.memberId === null ? undefined : index.membersById.get(request.memberId);
  const isMemberUnknown = request.memberId !== null && member === undefined;

  if (isTreeUnknown || isMemberUnknown) return { ...base, notice: 'treeNotFound' };

  const treeFromMember = member?.treeId ?? null;
  // A member that belongs to another tree than the path says is ignored rather than trusted.
  const isMemberInPathTree = treeFromPath === null || treeFromMember === treeFromPath;
  const selectedMemberId = member && isMemberInPathTree ? member.memberId : null;
  const selectedTreeId = treeFromPath ?? (selectedMemberId === null ? null : treeFromMember);
  const view = request.view === 'lineage' && selectedTreeId !== null ? 'lineage' : 'graph';
  return { ...base, selectedTreeId, selectedMemberId, view };
}
