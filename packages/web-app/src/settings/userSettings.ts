import {
  EMPTY_MEMBER_FILTERS,
  MEMBERSHIP_LEVELS,
  NO_PROGRAM_YEAR,
  REGIONS,
  type MemberFilters,
} from '@mentor-tree/domain';

export const COLOR_MODES = ['uniform', 'programYear', 'region', 'level'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const LABEL_MODES = ['auto', 'always', 'never'] as const;
export type LabelMode = (typeof LABEL_MODES)[number];

/** Choices a visitor makes in the settings panel; kept in localStorage (SPEC 7.8). */
export interface UserSettings {
  colorMode: ColorMode;
  labelMode: LabelMode;
  showCity: boolean;
  showLevel: boolean;
  showProgramYear: boolean;
  shouldScaleNodes: boolean;
  filters: MemberFilters;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  colorMode: 'uniform',
  labelMode: 'auto',
  showCity: true,
  showLevel: true,
  showProgramYear: true,
  shouldScaleNodes: true,
  filters: EMPTY_MEMBER_FILTERS,
};

function pickAllowed<Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  fallback: Value,
): Value {
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pickList<Value>(value: unknown, isValid: (item: unknown) => item is Value): Value[] {
  return Array.isArray(value) ? value.filter(isValid) : [];
}

const isString = (item: unknown): item is string => typeof item === 'string';
const isProgramYear = (item: unknown): item is number | typeof NO_PROGRAM_YEAR =>
  item === NO_PROGRAM_YEAR || (typeof item === 'number' && Number.isInteger(item));

/** Stored data may be stale or tampered with: every field is checked, bad ones fall back to defaults. */
export function sanitizeUserSettings(stored: unknown): UserSettings {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_USER_SETTINGS;
  const record = stored as Record<string, unknown>;
  const storedFilters =
    typeof record['filters'] === 'object' && record['filters'] !== null
      ? (record['filters'] as Record<string, unknown>)
      : {};
  return {
    colorMode: pickAllowed(record['colorMode'], COLOR_MODES, DEFAULT_USER_SETTINGS.colorMode),
    labelMode: pickAllowed(record['labelMode'], LABEL_MODES, DEFAULT_USER_SETTINGS.labelMode),
    showCity: pickBoolean(record['showCity'], DEFAULT_USER_SETTINGS.showCity),
    showLevel: pickBoolean(record['showLevel'], DEFAULT_USER_SETTINGS.showLevel),
    showProgramYear: pickBoolean(record['showProgramYear'], DEFAULT_USER_SETTINGS.showProgramYear),
    shouldScaleNodes: pickBoolean(
      record['shouldScaleNodes'],
      DEFAULT_USER_SETTINGS.shouldScaleNodes,
    ),
    filters: {
      regions: pickList(storedFilters['regions'], (item): item is (typeof REGIONS)[number] =>
        REGIONS.some((region) => region === item),
      ),
      cityKeys: pickList(storedFilters['cityKeys'], isString),
      levels: pickList(
        storedFilters['levels'],
        (item): item is (typeof MEMBERSHIP_LEVELS)[number] =>
          MEMBERSHIP_LEVELS.some((level) => level === item),
      ),
      programYears: pickList(storedFilters['programYears'], isProgramYear),
    },
  };
}
