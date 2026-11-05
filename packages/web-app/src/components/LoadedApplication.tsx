import { useEffect } from 'react';
import logoUrl from '../../../../assets/brand/usf-mark-yellow.png';
import { useApplication, useSelectionActions, useTranslations } from '../state/ApplicationContext';
import { useUrlSynchronization } from '../state/useUrlSynchronization';
import { AppearanceProvider } from '../appearance/AppearanceContext';
import { ColorLegend } from './ColorLegend';
import { DataDisclaimer } from './DataDisclaimer';
import { GraphView } from './GraphView';
import { LargestTreesButton, LargestTreesPanel } from './LargestTreesPanel';
import { LineageHeader } from './LineageHeader';
import { LineageView } from './LineageView';
import { ViewSwitch } from './ViewSwitch';
import { LanguageSwitch } from './LanguageSwitch';
import { NoticeBanner } from './NoticeBanner';
import { PersonCard } from './PersonCard';
import { SearchBox } from './SearchBox';
import { SettingsButton, SettingsPanel } from './SettingsPanel';
import { EmptyDataScreen } from './StatusScreens';

export function LoadedApplication() {
  const { state, dispatch, index } = useApplication();
  const translations = useTranslations();
  const { clearSelection } = useSelectionActions();
  useUrlSynchronization(state, dispatch, index);

  useEffect(() => {
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target instanceof HTMLInputElement)) clearSelection();
    };
    document.addEventListener('keydown', clearOnEscape);
    return () => document.removeEventListener('keydown', clearOnEscape);
  }, [clearSelection]);

  const hasTrees = index.document.trees.length > 0;
  return (
    <AppearanceProvider>
      <div className="layout">
        {hasTrees ? (
          state.view === 'lineage' ? (
            <LineageView />
          ) : (
            <GraphView />
          )
        ) : (
          <EmptyDataScreen language={state.language} formUrl={index.document.settings.formUrl} />
        )}
        <div className="top-left">
          <header className="brand">
            <img className="brand__logo" src={logoUrl} alt={translations.logoDescription} />
            <h1 className="brand__title">{translations.siteName}</h1>
          </header>
          <LargestTreesButton />
        </div>
        <div className="top-center">
          <SearchBox />
          <ViewSwitch />
        </div>
        {state.view === 'lineage' && <LineageHeader />}
        <div className="top-right">
          <LanguageSwitch />
          <SettingsButton />
        </div>
        <NoticeBanner />
        <PersonCard />
        <ColorLegend />
        {state.openPanel === 'settings' && <SettingsPanel />}
        {state.openPanel === 'largestTrees' && <LargestTreesPanel />}
        <DataDisclaimer />
      </div>
    </AppearanceProvider>
  );
}
