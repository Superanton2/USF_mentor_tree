import { en } from './en';
import type { Language, Translations } from './translations';
import { uk } from './uk';

export * from './translations';
export * from './formatting';

export const TRANSLATIONS: Record<Language, Translations> = { uk, en };
