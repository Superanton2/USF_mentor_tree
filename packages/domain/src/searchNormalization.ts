const APOSTROPHES = /[ʼ'’‘ʻ`]/g;
const WORD_SEPARATORS = /[\s-]+/;

/** Case, apostrophe variants and extra spaces must not affect matching (SPEC 7.5). */
export function normalizeSearchText(text: string): string {
  return text.toLocaleLowerCase('uk').replaceAll(APOSTROPHES, "'").replaceAll(/\s+/g, ' ').trim();
}

function splitWords(normalizedText: string): string[] {
  return normalizedText.split(WORD_SEPARATORS).filter((word) => word !== '');
}

/** Word order is irrelevant; every query word must start some word of the name. */
export function matchesSearchQuery(normalizedName: string, normalizedQuery: string): boolean {
  const queryWords = splitWords(normalizedQuery);
  if (queryWords.length === 0) return false;
  const nameWords = splitWords(normalizedName);
  return queryWords.every((queryWord) =>
    nameWords.some((nameWord) => nameWord.startsWith(queryWord)),
  );
}

/** Lower is better: names where query words are whole words come first. */
export function rankSearchMatch(normalizedName: string, normalizedQuery: string): number {
  const nameWords = new Set(splitWords(normalizedName));
  const queryWords = splitWords(normalizedQuery);
  return queryWords.filter((queryWord) => !nameWords.has(queryWord)).length;
}
