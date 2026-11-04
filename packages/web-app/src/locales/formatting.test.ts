import { describe, expect, it } from 'vitest';
import { formatCountWithNoun, formatPublicationDate } from './formatting';
import { TRANSLATIONS } from './index';

describe('formatCountWithNoun', () => {
  it.each([
    [1, '1 учасник'],
    [2, '2 учасники'],
    [5, '5 учасників'],
    [11, '11 учасників'],
    [21, '21 учасник'],
    [22, '22 учасники'],
  ])('uk %i', (count, expected) => {
    expect(formatCountWithNoun('uk', count, TRANSLATIONS.uk.memberCount)).toBe(expected);
  });

  it('en uses one/other', () => {
    expect(formatCountWithNoun('en', 1, TRANSLATIONS.en.memberCount)).toBe('1 member');
    expect(formatCountWithNoun('en', 3, TRANSLATIONS.en.memberCount)).toBe('3 members');
  });
});

describe('formatPublicationDate', () => {
  it('formats in the interface language', () => {
    expect(formatPublicationDate('uk', '2026-11-04T10:00:00Z')).toBe('4 листопада 2026 р.');
    expect(formatPublicationDate('en', '2026-11-04T10:00:00Z')).toBe('November 4, 2026');
  });
});
