import { findTreeFounder, searchMembers, type GraphMember } from '@mentor-tree/domain';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { findCityName } from '../data/memberDescription';
import {
  getDisplayName,
  useApplication,
  useSelectionActions,
  useTranslations,
} from '../state/ApplicationContext';

const SEARCH_HOTKEY = '/';

export function SearchBox() {
  const { index, state } = useApplication();
  const translations = useTranslations();
  const { selectMember } = useSelectionActions();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activePosition, setActivePosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const results = useMemo(() => searchMembers(index, query), [index, query]);
  const hasQuery = query.trim() !== '';
  const formUrl = index.document.settings.formUrl;

  useEffect(() => {
    const focusOnHotkey = (event: globalThis.KeyboardEvent) => {
      const isTyping =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key !== SEARCH_HOTKEY || isTyping) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', focusOnHotkey);
    return () => document.removeEventListener('keydown', focusOnHotkey);
  }, []);

  const choose = (member: GraphMember) => {
    selectMember(member.memberId);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActivePosition((position) => Math.min(position + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActivePosition((position) => Math.max(position - 1, 0));
    } else if (event.key === 'Enter') {
      const activeMember = results[activePosition];
      if (isOpen && activeMember) choose(activeMember);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const describeResult = (member: GraphMember): string => {
    const founder = member.treeId === null ? null : findTreeFounder(index, member.treeId);
    return founder
      ? translations.resultTree(getDisplayName(founder, translations))
      : translations.resultNotInTree;
  };

  const isListVisible = isOpen && hasQuery;
  return (
    <div className="search">
      <input
        ref={inputRef}
        className="search__input"
        type="search"
        role="combobox"
        aria-label={translations.searchLabel}
        aria-expanded={isListVisible}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          isListVisible && results[activePosition] ? `${listboxId}-${activePosition}` : undefined
        }
        placeholder={translations.searchPlaceholder}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActivePosition(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {isListVisible && (
        <div className="search__popup">
          {results.length > 0 ? (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={translations.searchResultsLabel}
              className="search__list"
            >
              {results.map((member, position) => (
                <li
                  key={member.memberId}
                  id={`${listboxId}-${position}`}
                  role="option"
                  aria-selected={position === activePosition}
                  className="search__option"
                  data-active={position === activePosition}
                  // onMouseDown fires before the input's blur closes the list.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(member);
                  }}
                >
                  <span className="search__name">{member.fullName}</span>
                  <span className="search__meta">
                    {[findCityName(index, member, state.language), describeResult(member)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="search__empty" role="status">
              <p>{translations.searchNothingFound}</p>
              {formUrl && (
                <a className="button" href={formUrl} target="_blank" rel="noreferrer">
                  {translations.fillForm}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
