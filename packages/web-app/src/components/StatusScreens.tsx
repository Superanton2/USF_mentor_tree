import { TRANSLATIONS, type Language } from '../locales';

export function LoadingScreen({ language }: { language: Language }) {
  return (
    <div className="status-screen" role="status">
      <span className="status-screen__spinner" aria-hidden="true" />
      <p>{TRANSLATIONS[language].loading}</p>
    </div>
  );
}

export function LoadErrorScreen({
  language,
  onRetry,
}: {
  language: Language;
  onRetry: () => void;
}) {
  const translations = TRANSLATIONS[language];
  return (
    <div className="status-screen" role="alert">
      <p>{translations.loadError}</p>
      <button type="button" className="button" onClick={onRetry}>
        {translations.retry}
      </button>
    </div>
  );
}

export function EmptyDataScreen({
  language,
  formUrl,
}: {
  language: Language;
  formUrl: string | null;
}) {
  const translations = TRANSLATIONS[language];
  return (
    <div className="status-screen">
      <p>{translations.emptyData}</p>
      {formUrl && (
        <a className="button" href={formUrl} target="_blank" rel="noreferrer">
          {translations.fillForm}
        </a>
      )}
    </div>
  );
}
