import { useCallback, useEffect, useReducer, useState } from 'react';
import { LoadErrorScreen, LoadingScreen } from './components/StatusScreens';
import { loadGraphIndex } from './data/graphDocumentLoading';
import { TRANSLATIONS } from './locales';
import { parseRoute } from './routing/locationRouting';
import {
  applicationReducer,
  createInitialState,
  resolveRouteAgainstData,
} from './state/applicationState';
import { ApplicationContext } from './state/ApplicationContext';
import { LoadedApplication } from './components/LoadedApplication';
import type { GraphIndex } from '@mentor-tree/domain';

type LoadingState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; index: GraphIndex };

export function Application() {
  const [state, dispatch] = useReducer(applicationReducer, undefined, () =>
    createInitialState(parseRoute(window.location.pathname, window.location.search).language),
  );
  const [loadingState, setLoadingState] = useState<LoadingState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const translations = TRANSLATIONS[state.language];

  useEffect(() => {
    let isCancelled = false;
    setLoadingState({ status: 'loading' });
    loadGraphIndex().then(
      (index) => {
        if (isCancelled) return;
        // Resolved together with `ready`, so the first render already has the URL's selection.
        dispatch({
          type: 'locationRestored',
          state: resolveRouteAgainstData(
            parseRoute(window.location.pathname, window.location.search),
            index,
          ),
        });
        setLoadingState({ status: 'ready', index });
      },
      () => !isCancelled && setLoadingState({ status: 'failed' }),
    );
    return () => {
      isCancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    document.title = translations.htmlTitle;
  }, [translations]);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

  if (loadingState.status === 'loading') return <LoadingScreen language={state.language} />;
  if (loadingState.status === 'failed')
    return <LoadErrorScreen language={state.language} onRetry={retry} />;
  return (
    <ApplicationContext.Provider value={{ state, dispatch, index: loadingState.index }}>
      <LoadedApplication />
    </ApplicationContext.Provider>
  );
}
