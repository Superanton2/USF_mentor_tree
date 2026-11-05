import { formatPublicationDate } from '../locales';
import { useApplication, useTranslations } from '../state/ApplicationContext';

export function DataDisclaimer() {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const { formUrl } = index.document.settings;
  return (
    <footer className="disclaimer">
      <p className="disclaimer__text">
        {translations.disclaimerBeforeLink}
        {formUrl && (
          <a className="disclaimer__link" href={formUrl} target="_blank" rel="noreferrer">
            {translations.disclaimerLink}
          </a>
        )}
      </p>
      <p className="disclaimer__date">
        {translations.dataUpdatedOn(
          formatPublicationDate(state.language, index.document.publishedAt),
        )}
      </p>
    </footer>
  );
}
