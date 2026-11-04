import type { Language, PluralForms } from './translations';

/** Picks the plural form with Intl.PluralRules (учасник / учасники / учасників). */
export function formatCountWithNoun(language: Language, count: number, forms: PluralForms): string {
  const category = new Intl.PluralRules(language).select(count);
  const noun =
    category === 'one' || category === 'few' || category === 'many'
      ? (forms[category] ?? forms.other)
      : forms.other;
  return `${count} ${noun}`;
}

export function formatPublicationDate(language: Language, isoDate: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date(isoDate));
}
