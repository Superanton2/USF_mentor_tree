import { SUPPORTED_LANGUAGES } from '../locales';
import { useApplication, useTranslations } from '../state/ApplicationContext';

export function LanguageSwitch() {
  const { state, dispatch } = useApplication();
  const translations = useTranslations();
  return (
    <div className="language-switch" role="group" aria-label={translations.languageSwitchLabel}>
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          className="language-switch__option"
          aria-pressed={state.language === language}
          onClick={() => dispatch({ type: 'languageChanged', language })}
        >
          {language === 'uk' ? 'УКР' : 'ENG'}
        </button>
      ))}
    </div>
  );
}
