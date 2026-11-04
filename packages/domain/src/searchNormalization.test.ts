import { describe, expect, it } from 'vitest';
import { matchesSearchQuery, normalizeSearchText, rankSearchMatch } from './searchNormalization';

describe('normalizeSearchText', () => {
  it('unifies case, apostrophes and spaces', () => {
    expect(normalizeSearchText('  Дар’я   О`КОНЕЛ  ')).toBe("дар'я о'конел");
    expect(normalizeSearchText('Дарʼя')).toBe("дар'я");
  });
});

describe('matchesSearchQuery', () => {
  const name = normalizeSearchText('Микита Храмов');
  it.each(['храмов микита', 'мик', 'хр ми', 'МИКИТА'])('matches "%s"', (query) => {
    expect(matchesSearchQuery(name, normalizeSearchText(query))).toBe(true);
  });
  it.each(['', '   ', 'ікита', 'микита петренко'])('does not match "%s"', (query) => {
    expect(matchesSearchQuery(name, normalizeSearchText(query))).toBe(false);
  });
  it('splits hyphenated surnames into words', () => {
    expect(matchesSearchQuery('анна коваль-шевченко', 'шев')).toBe(true);
  });
});

describe('rankSearchMatch', () => {
  it('prefers whole-word matches', () => {
    expect(rankSearchMatch('анна коваль', 'анна')).toBe(0);
    expect(rankSearchMatch('аннабель коваль', 'анна')).toBe(1);
  });
});
