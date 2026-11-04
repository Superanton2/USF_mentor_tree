import { findTreeFounder } from '@mentor-tree/domain';
import { formatCountWithNoun } from '../locales';
import { useApplication, useTranslations } from '../state/ApplicationContext';

export function LineageHeader() {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const tree =
    state.selectedTreeId === null ? undefined : index.treesById.get(state.selectedTreeId);
  const founder = tree ? findTreeFounder(index, tree.treeId) : null;
  if (!tree || !founder) return null;
  const title =
    founder.fullName === null
      ? translations.hiddenFounderTreeName
      : translations.treeTitle(founder.fullName);
  return (
    <p className="lineage-header" data-testid="lineage-header">
      <span className="lineage-header__title">{title}</span>
      {' · '}
      {formatCountWithNoun(state.language, tree.memberCount, translations.memberCount)}
    </p>
  );
}
