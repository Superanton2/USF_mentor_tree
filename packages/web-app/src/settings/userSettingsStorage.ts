import { DEFAULT_USER_SETTINGS, sanitizeUserSettings, type UserSettings } from './userSettings';

export const USER_SETTINGS_STORAGE_KEY = 'usf-mentor-tree:settings:v1';

/** Storage can be missing or throw (private mode, blocked cookies): everything then works without saving. */
function findStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadUserSettings(storage: Storage | null = findStorage()): UserSettings {
  if (storage === null) return DEFAULT_USER_SETTINGS;
  try {
    const stored = storage.getItem(USER_SETTINGS_STORAGE_KEY);
    return stored === null ? DEFAULT_USER_SETTINGS : sanitizeUserSettings(JSON.parse(stored));
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(
  settings: UserSettings,
  storage: Storage | null = findStorage(),
): void {
  if (storage === null) return;
  try {
    storage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded or storage blocked: the settings simply last until the page is closed.
  }
}
