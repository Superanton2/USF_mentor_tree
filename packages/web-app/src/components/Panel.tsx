import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useApplication, useTranslations } from '../state/ApplicationContext';

interface PanelProperties {
  title: string;
  /** Desktop edge the drawer slides from; on mobile every panel is a bottom sheet. */
  side: 'left' | 'right';
  children: ReactNode;
}

/**
 * Shared shell of the settings drawer and the largest-trees list: a dialog that takes focus
 * when opened, closes on Escape and hands focus back to whatever opened it.
 */
export function Panel({ title, side, children }: PanelProperties) {
  const { dispatch } = useApplication();
  const translations = useTranslations();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    // Stops the global "Escape clears the selection" handler: the panel closes first.
    event.stopPropagation();
    dispatch({ type: 'panelClosed' });
  };

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      className={`panel panel--${side}`}
      onKeyDown={closeOnEscape}
    >
      <header className="panel__header">
        <h2 className="panel__title">{title}</h2>
        <button
          type="button"
          className="panel__close"
          aria-label={translations.closePanel}
          onClick={() => dispatch({ type: 'panelClosed' })}
        >
          ×
        </button>
      </header>
      <div className="panel__body">{children}</div>
    </aside>
  );
}
