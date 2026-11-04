import { useApplication, useTranslations } from '../state/ApplicationContext';
import type { ViewMode } from '../routing/locationRouting';

const VIEWS: readonly ViewMode[] = ['graph', 'lineage'];

/** Segmented "Граф | Дерево" control; "Дерево" needs a chosen tree (SPEC 7.3). */
export function ViewSwitch() {
  const { state, dispatch } = useApplication();
  const translations = useTranslations();
  const isLineageAvailable = state.selectedTreeId !== null;
  return (
    <div className="view-switch" role="group" aria-label={translations.viewSwitchLabel}>
      {VIEWS.map((view) => {
        const isDisabled = view === 'lineage' && !isLineageAvailable;
        return (
          <button
            key={view}
            type="button"
            className="view-switch__option"
            aria-pressed={state.view === view}
            disabled={isDisabled}
            title={isDisabled ? translations.lineageUnavailableHint : undefined}
            onClick={() => dispatch({ type: 'viewChanged', view })}
          >
            {view === 'graph' ? translations.viewGraph : translations.viewLineage}
          </button>
        );
      })}
    </div>
  );
}
