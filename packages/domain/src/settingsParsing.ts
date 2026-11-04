import { createImportIssue, type ImportIssue } from './importIssue';
import type { RawSettingRecord } from './membershipTypes';

export interface Settings {
  publishRequested: boolean;
  formUrl: string | null;
  showMembersWithoutConnections: boolean;
  largestTreesCount: number;
  labelZoomThreshold: number;
  dimmedOpacity: number;
  memberCountDropAbortPercent: number;
  colorNode: string;
  colorLink: string;
  colorHighlight: string;
  yearColorNewest: string;
  yearColorOldest: string;
  regionColorWest: string;
  regionColorCenter: string;
  regionColorEast: string;
  regionColorSouth: string;
  levelColorActivist: string;
  levelColorFunctionary: string;
  levelColorCoordinator: string;
  levelColorSeniorCoordinator: string;
  exportGradientStart: string;
  exportGradientEnd: string;
}

type SettingKey = keyof Settings;

type SettingDefinition =
  | { kind: 'boolean'; defaultValue: boolean }
  | { kind: 'integer'; defaultValue: number; minimum: number; maximum: number }
  | { kind: 'number'; defaultValue: number; minimum: number; maximum: number }
  | { kind: 'color'; defaultValue: string }
  | { kind: 'httpsUrl'; defaultValue: null };

export const SETTING_DEFINITIONS: Record<SettingKey, SettingDefinition> = {
  publishRequested: { kind: 'boolean', defaultValue: false },
  formUrl: { kind: 'httpsUrl', defaultValue: null },
  showMembersWithoutConnections: { kind: 'boolean', defaultValue: false },
  largestTreesCount: { kind: 'integer', defaultValue: 10, minimum: 1, maximum: 100 },
  labelZoomThreshold: { kind: 'number', defaultValue: 1.5, minimum: 0.1, maximum: 20 },
  dimmedOpacity: { kind: 'number', defaultValue: 0.12, minimum: 0, maximum: 1 },
  memberCountDropAbortPercent: { kind: 'number', defaultValue: 50, minimum: 0, maximum: 100 },
  colorNode: { kind: 'color', defaultValue: '#8C8C8C' },
  colorLink: { kind: 'color', defaultValue: '#3A3A3A' },
  colorHighlight: { kind: 'color', defaultValue: '#FFD600' },
  yearColorNewest: { kind: 'color', defaultValue: '#FFD600' },
  yearColorOldest: { kind: 'color', defaultValue: '#4A4A4A' },
  regionColorWest: { kind: 'color', defaultValue: '#FFD600' },
  regionColorCenter: { kind: 'color', defaultValue: '#FFFFFF' },
  regionColorEast: { kind: 'color', defaultValue: '#9E9E9E' },
  regionColorSouth: { kind: 'color', defaultValue: '#B8860B' },
  levelColorActivist: { kind: 'color', defaultValue: '#6E6E6E' },
  levelColorFunctionary: { kind: 'color', defaultValue: '#BDBDBD' },
  levelColorCoordinator: { kind: 'color', defaultValue: '#FFFFFF' },
  levelColorSeniorCoordinator: { kind: 'color', defaultValue: '#FFD600' },
  exportGradientStart: { kind: 'color', defaultValue: '#FFD600' },
  exportGradientEnd: { kind: 'color', defaultValue: '#FFF1A6' },
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type ParsedValue = { isValid: true; value: string | number | boolean | null } | { isValid: false };

function parseValue(definition: SettingDefinition, text: string): ParsedValue {
  switch (definition.kind) {
    case 'boolean': {
      const normalized = text.toUpperCase();
      if (normalized === 'TRUE') return { isValid: true, value: true };
      if (normalized === 'FALSE') return { isValid: true, value: false };
      return { isValid: false };
    }
    case 'integer':
    case 'number': {
      const number = Number(text.replace(',', '.'));
      const isInRange = number >= definition.minimum && number <= definition.maximum;
      const isWholeEnough = definition.kind === 'number' || Number.isInteger(number);
      return Number.isFinite(number) && isInRange && isWholeEnough
        ? { isValid: true, value: number }
        : { isValid: false };
    }
    case 'color':
      return HEX_COLOR.test(text)
        ? { isValid: true, value: text.toUpperCase() }
        : { isValid: false };
    case 'httpsUrl': {
      // Only https: links are allowed because the URL ends up in a public page (SPEC 12.5).
      try {
        return new URL(text).protocol === 'https:'
          ? { isValid: true, value: text }
          : { isValid: false };
      } catch {
        return { isValid: false };
      }
    }
  }
}

export function parseSettings(records: readonly RawSettingRecord[]): {
  settings: Settings;
  issues: ImportIssue[];
} {
  const values: Record<string, string | number | boolean | null> = Object.fromEntries(
    Object.entries(SETTING_DEFINITIONS).map(([key, definition]) => [key, definition.defaultValue]),
  );
  const issues: ImportIssue[] = [];

  for (const record of records) {
    const key = record.key.trim();
    const definition = SETTING_DEFINITIONS[key as SettingKey];
    const text = record.value.trim();
    // Keys not listed in the definitions are service data or comments and are ignored.
    if (!Object.hasOwn(SETTING_DEFINITIONS, key) || text === '') continue;

    const parsed = parseValue(definition, text);
    if (parsed.isValid) {
      values[key] = parsed.value;
      continue;
    }
    issues.push(
      createImportIssue({
        code: 'INVALID_SETTING',
        sourceRow: record.sourceRow,
        description: `Значення «${text}» для налаштування «${key}» некоректне — використано значення за замовчуванням.`,
      }),
    );
  }
  // The definitions cover every key of Settings (checked by a test), so this cast is safe.
  return { settings: values as unknown as Settings, issues };
}
