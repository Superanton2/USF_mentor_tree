import { useApplication, useTranslations } from '../state/ApplicationContext';

export function NoticeBanner() {
  const { state, dispatch } = useApplication();
  const translations = useTranslations();
  if (state.notice === null) return null;
  return (
    <div className="notice" role="status">
      <span>{translations.treeNotFound}</span>
      <button
        type="button"
        className="notice__dismiss"
        aria-label={translations.dismiss}
        onClick={() => dispatch({ type: 'noticeDismissed' })}
      >
        ×
      </button>
    </div>
  );
}
