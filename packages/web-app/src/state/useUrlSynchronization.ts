import type { GraphIndex } from '@mentor-tree/domain';
import { useEffect, useRef, type Dispatch } from 'react';
import { buildPath, parseRoute } from '../routing/locationRouting';
import {
  resolveRouteAgainstData,
  type ApplicationAction,
  type ApplicationState,
} from './applicationState';

function currentPath(): string {
  return window.location.pathname + window.location.search;
}

/**
 * Keeps the address bar and the state in step. The initial URL is resolved by the caller before
 * the first render (otherwise this hook would overwrite it); later state changes push history
 * entries, and back/forward restore states (SPEC 7.4).
 */
export function useUrlSynchronization(
  state: ApplicationState,
  dispatch: Dispatch<ApplicationAction>,
  index: GraphIndex,
): void {
  const hasRestoredInitialLocation = useRef(false);

  useEffect(() => {
    const restoreFromLocation = () =>
      dispatch({
        type: 'locationRestored',
        state: resolveRouteAgainstData(
          parseRoute(window.location.pathname, window.location.search),
          index,
        ),
      });
    window.addEventListener('popstate', restoreFromLocation);
    return () => window.removeEventListener('popstate', restoreFromLocation);
  }, [dispatch, index]);

  useEffect(() => {
    const path = buildPath({
      language: state.language,
      treeId: state.selectedTreeId,
      memberId: state.selectedMemberId,
      view: state.view,
    });
    if (path === currentPath()) {
      hasRestoredInitialLocation.current = true;
      return;
    }
    // The first sync only canonicalizes the URL; later ones are user navigation.
    if (hasRestoredInitialLocation.current) window.history.pushState(null, '', path);
    else window.history.replaceState(null, '', path);
    hasRestoredInitialLocation.current = true;
  }, [state.language, state.selectedTreeId, state.selectedMemberId, state.view]);

  useEffect(() => {
    document.documentElement.lang = state.language;
  }, [state.language]);
}
