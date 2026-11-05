import { findTreeFounder, listLargestTrees } from '@mentor-tree/domain';
import { formatCountWithNoun } from '../locales';
import { getDisplayName, useApplication, useTranslations } from '../state/ApplicationContext';
import { Panel } from './Panel';

export function LargestTreesButton() {
  const { state, dispatch } = useApplication();
  const translations = useTranslations();
  return (
    <button
      type="button"
      className="pill-button"
      aria-haspopup="dialog"
      aria-expanded={state.openPanel === 'largestTrees'}
      onClick={() => dispatch({ type: 'panelOpened', panel: 'largestTrees' })}
    >
      {translations.largestTreesButton}
    </button>
  );
}

/** Top-N trees by size (`largestTreesCount` from the admin settings); clicking one selects it. */
export function LargestTreesPanel() {
  const { state, dispatch, index } = useApplication();
  const translations = useTranslations();
  const trees = listLargestTrees(index.document.trees, index.document.settings.largestTreesCount);

  return (
    <Panel title={translations.largestTreesTitle} side="left">
      <ol className="tree-list">
        {trees.map((tree, position) => {
          const founder = findTreeFounder(index, tree.treeId);
          const founderName = founder ? getDisplayName(founder, translations) : tree.treeId;
          return (
            <li key={tree.treeId}>
              <button
                type="button"
                className="tree-list__item"
                aria-current={state.selectedTreeId === tree.treeId}
                onClick={() => {
                  dispatch({ type: 'treeSelected', treeId: tree.treeId });
                  dispatch({ type: 'panelClosed' });
                }}
              >
                <span className="tree-list__place">{position + 1}</span>
                <span className="tree-list__founder">{founderName}</span>
                <span className="tree-list__count">
                  {formatCountWithNoun(state.language, tree.memberCount, translations.memberCount)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
