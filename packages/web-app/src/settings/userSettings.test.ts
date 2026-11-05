import { EMPTY_MEMBER_FILTERS } from '@mentor-tree/domain';
import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS, sanitizeUserSettings } from './userSettings';
import {
  USER_SETTINGS_STORAGE_KEY,
  loadUserSettings,
  saveUserSettings,
} from './userSettingsStorage';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
const asStorage = (storage: object) => storage as Storage;

describe('sanitizeUserSettings', () => {
  it('returns defaults for anything that is not an object', () => {
    for (const value of [null, undefined, 5, 'x', []]) {
      expect(sanitizeUserSettings(value)).toEqual(
        value instanceof Array ? DEFAULT_USER_SETTINGS : DEFAULT_USER_SETTINGS,
      );
    }
  });
  it('keeps valid values', () => {
    const settings = {
      ...DEFAULT_USER_SETTINGS,
      colorMode: 'region',
      labelMode: 'never',
      showCity: false,
      filters: {
        regions: ['west'],
        cityKeys: ['kyiv'],
        levels: ['activist'],
        programYears: [2023, 'none'],
      },
    };
    expect(sanitizeUserSettings(settings)).toEqual(settings);
  });
  it('replaces invalid fields and drops invalid list items', () => {
    const result = sanitizeUserSettings({
      colorMode: 'rainbow',
      labelMode: 3,
      showLevel: 'yes',
      filters: {
        regions: ['west', 'mars'],
        cityKeys: [1, 'kyiv'],
        levels: 'activist',
        programYears: [2023.5, 'none', 2020],
      },
    });
    expect(result.colorMode).toBe('uniform');
    expect(result.labelMode).toBe('auto');
    expect(result.showLevel).toBe(true);
    expect(result.filters).toEqual({
      regions: ['west'],
      cityKeys: ['kyiv'],
      levels: [],
      programYears: ['none', 2020],
    });
  });
  it('defaults have no active filters', () =>
    expect(DEFAULT_USER_SETTINGS.filters).toEqual(EMPTY_MEMBER_FILTERS));
});

describe('settings storage', () => {
  it('round-trips through storage', () => {
    const storage = new MemoryStorage();
    const settings = { ...DEFAULT_USER_SETTINGS, colorMode: 'level' as const };
    saveUserSettings(settings, asStorage(storage));
    expect(loadUserSettings(asStorage(storage))).toEqual(settings);
  });
  it('falls back to defaults for missing, broken or unavailable storage', () => {
    expect(loadUserSettings(null)).toEqual(DEFAULT_USER_SETTINGS);
    expect(loadUserSettings(asStorage(new MemoryStorage()))).toEqual(DEFAULT_USER_SETTINGS);
    const broken = new MemoryStorage();
    broken.setItem(USER_SETTINGS_STORAGE_KEY, '{not json');
    expect(loadUserSettings(asStorage(broken))).toEqual(DEFAULT_USER_SETTINGS);
  });
  it('survives a storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadUserSettings(asStorage(throwing))).toEqual(DEFAULT_USER_SETTINGS);
    expect(() => saveUserSettings(DEFAULT_USER_SETTINGS, asStorage(throwing))).not.toThrow();
    expect(() => saveUserSettings(DEFAULT_USER_SETTINGS, null)).not.toThrow();
  });
});
