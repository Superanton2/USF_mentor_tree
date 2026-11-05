import {
  MEMBERSHIP_LEVELS,
  NO_PROGRAM_YEAR,
  REGIONS,
  hasActiveFilters,
  listCitiesByMemberCount,
  listProgramYears,
  normalizeSearchText,
  type MemberFilters,
  type ProgramYearFilterValue,
} from '@mentor-tree/domain';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { COLOR_MODES, LABEL_MODES, type UserSettings } from '../settings/userSettings';
import { useApplication, useTranslations } from '../state/ApplicationContext';
import { Panel } from './Panel';

export function SettingsButton() {
  const { state, dispatch } = useApplication();
  const translations = useTranslations();
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={translations.settingsButton}
      aria-haspopup="dialog"
      aria-expanded={state.openPanel === 'settings'}
      onClick={() => dispatch({ type: 'panelOpened', panel: 'settings' })}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </button>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const bodyId = useId();
  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <h3 className="settings-section__title">
          <button
            type="button"
            className="settings-section__toggle"
            aria-expanded={isOpen}
            aria-controls={bodyId}
            onClick={() => setIsOpen((previous) => !previous)}
          >
            <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span> {title}
          </button>
        </h3>
        {isOpen && actions}
      </div>
      {isOpen && (
        <div id={bodyId} className="settings-section__body">
          {children}
        </div>
      )}
    </section>
  );
}

interface ChipOption<Value> {
  value: Value;
  label: string;
}

function ChipGroup<Value extends string | number>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: ChipOption<Value>[];
  selected: readonly Value[];
  onToggle: (value: Value) => void;
}) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="field__label">{label}</span>
      <div className="chips">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="chip"
            aria-pressed={selected.includes(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function toggled<Value>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value)
    ? values.filter((existing) => existing !== value)
    : [...values, value];
}

function CityFilter({
  filters,
  onChange,
}: {
  filters: MemberFilters;
  onChange: (cityKeys: string[]) => void;
}) {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listId = useId();
  const cities = useMemo(
    () => listCitiesByMemberCount(index.document.members, index.document.cities),
    [index],
  );
  const normalizedQuery = normalizeSearchText(query);
  const visibleCities = cities.filter(({ city }) =>
    normalizeSearchText(city.names[state.language]).includes(normalizedQuery),
  );

  return (
    <div className="field">
      <span className="field__label">{translations.cityFilterLabel}</span>
      <button
        type="button"
        className="select-button"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        {filters.cityKeys.length === 0
          ? translations.allCities
          : translations.selectedCities(filters.cityKeys.length)}
        <span aria-hidden="true"> ▾</span>
      </button>
      {isOpen && (
        <div id={listId} className="select-popup">
          <input
            className="select-popup__search"
            type="search"
            placeholder={translations.citySearchPlaceholder}
            aria-label={translations.citySearchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul className="select-popup__list">
            {visibleCities.map(({ city, memberCount }) => (
              <li key={city.cityKey}>
                <label className="select-popup__option">
                  <input
                    type="checkbox"
                    checked={filters.cityKeys.includes(city.cityKey)}
                    onChange={() => onChange(toggled(filters.cityKeys, city.cityKey))}
                  />
                  <span>{city.names[state.language]}</span>
                  <span className="select-popup__count">{memberCount}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function RadioGroup<Value extends string>({
  label,
  name,
  values,
  labels,
  selected,
  onSelect,
}: {
  label: string;
  name: string;
  values: readonly Value[];
  labels: Record<Value, string>;
  selected: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <fieldset className="field radio-group">
      <legend className="field__label">{label}</legend>
      {values.map((value) => (
        <label key={value} className="radio">
          <input
            type="radio"
            name={name}
            checked={selected === value}
            onChange={() => onSelect(value)}
          />
          <span>{labels[value]}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function SettingsPanel() {
  const { state, dispatch, index } = useApplication();
  const translations = useTranslations();
  const { settings } = state;
  const years = useMemo(() => listProgramYears(index.document.members), [index]);
  const change = (changes: Partial<UserSettings>) => dispatch({ type: 'settingsChanged', changes });
  const changeFilters = (changes: Partial<MemberFilters>) =>
    change({ filters: { ...settings.filters, ...changes } });

  const yearOptions: ChipOption<ProgramYearFilterValue>[] = [
    ...years.map((year) => ({ value: year, label: String(year) })),
    { value: NO_PROGRAM_YEAR, label: translations.noProgramYear },
  ];

  return (
    <Panel title={translations.settingsTitle} side="right">
      <Section
        title={translations.filtersTitle}
        actions={
          hasActiveFilters(settings.filters) ? (
            <button
              type="button"
              className="link-button"
              onClick={() =>
                changeFilters({ regions: [], cityKeys: [], levels: [], programYears: [] })
              }
            >
              {translations.clearAllFilters}
            </button>
          ) : null
        }
      >
        <ChipGroup
          label={translations.regionFilterLabel}
          options={REGIONS.map((region) => ({
            value: region,
            label: translations.regions[region],
          }))}
          selected={settings.filters.regions}
          onToggle={(region) =>
            changeFilters({ regions: toggled(settings.filters.regions, region) })
          }
        />
        <CityFilter
          filters={settings.filters}
          onChange={(cityKeys) => changeFilters({ cityKeys })}
        />
        <ChipGroup
          label={translations.levelFilterLabel}
          options={MEMBERSHIP_LEVELS.map((level) => ({
            value: level,
            label: translations.levels[level],
          }))}
          selected={settings.filters.levels}
          onToggle={(level) => changeFilters({ levels: toggled(settings.filters.levels, level) })}
        />
        <ChipGroup
          label={translations.yearFilterLabel}
          options={yearOptions}
          selected={settings.filters.programYears}
          onToggle={(year) =>
            changeFilters({ programYears: toggled(settings.filters.programYears, year) })
          }
        />
      </Section>

      <Section title={translations.displayTitle}>
        <RadioGroup
          label={translations.labelsLabel}
          name="label-mode"
          values={LABEL_MODES}
          labels={translations.labelModes}
          selected={settings.labelMode}
          onSelect={(labelMode) => change({ labelMode })}
        />
        <Toggle
          label={translations.showCityLabel}
          checked={settings.showCity}
          onChange={(showCity) => change({ showCity })}
        />
        <Toggle
          label={translations.showLevelLabel}
          checked={settings.showLevel}
          onChange={(showLevel) => change({ showLevel })}
        />
        <Toggle
          label={translations.showProgramYearLabel}
          checked={settings.showProgramYear}
          onChange={(showProgramYear) => change({ showProgramYear })}
        />
        <Toggle
          label={translations.scaleNodesLabel}
          checked={settings.shouldScaleNodes}
          onChange={(shouldScaleNodes) => change({ shouldScaleNodes })}
        />
      </Section>

      <Section title={translations.colorsTitle}>
        <RadioGroup
          label={translations.colorModeLabel}
          name="color-mode"
          values={COLOR_MODES}
          labels={translations.colorModes}
          selected={settings.colorMode}
          onSelect={(colorMode) => change({ colorMode })}
        />
      </Section>

      <button
        type="button"
        className="button button--secondary"
        onClick={() => dispatch({ type: 'settingsReset' })}
      >
        {translations.resetSettings}
      </button>
    </Panel>
  );
}
