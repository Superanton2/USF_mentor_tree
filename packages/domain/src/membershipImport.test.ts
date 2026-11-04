import { describe, expect, it } from 'vitest';
import type { RawMembershipRecords } from './membershipImport';
import { importMembership } from './membershipImport';
import { formatImportReportRows } from './importReport';
import { rawLink, rawMember } from './testFixtures';

const cities = [
  { sourceRow: 2, ukrainianName: 'Київ', englishName: 'Kyiv', region: 'Центр' },
  { sourceRow: 3, ukrainianName: 'Львів', englishName: 'Lviv', region: 'Захід' },
];
const options = { currentYear: 2026, publishedAt: '2026-11-04T10:00:00.000Z' };

function records(overrides: Partial<RawMembershipRecords> = {}): RawMembershipRecords {
  return {
    members: [
      rawMember('1', { fullName: 'Секретна Людина', city: 'Львів' }),
      rawMember('2'),
      rawMember('3', { isHidden: true, fullName: 'Прихована Особа', city: 'Київ' }),
      rawMember('4'),
      rawMember('5', { isHidden: true, fullName: 'Одинак Прихований' }),
      rawMember('6'),
    ],
    links: [rawLink('1', '2'), rawLink('2', '3'), rawLink('3', '4')],
    cities,
    settings: [],
    sourceIssues: [],
    ...overrides,
  };
}

describe('importMembership', () => {
  const result = importMembership(records(), options);
  const document = result.graphDocument;

  it('builds a document with trees and members without a tree', () => {
    expect(document?.schemaVersion).toBe(1);
    expect(document?.trees).toEqual([{ treeId: '1', founderMemberId: '1', memberCount: 4 }]);
    expect(document?.members.find((member) => member.memberId === '6')).toMatchObject({
      treeId: null,
      descendantCount: 0,
    });
  });

  it('anonymises hidden members inside trees and keeps the structure', () => {
    const hidden = document?.members.find((member) => member.memberId === 'hidden-1');
    expect(hidden).toEqual({
      memberId: 'hidden-1',
      fullName: null,
      cityKey: null,
      membershipLevel: null,
      leadershipProgramYear: null,
      mentorMemberId: '2',
      treeId: '1',
      descendantCount: 1,
      isHidden: true,
    });
    expect(document?.members.find((member) => member.memberId === '4')?.mentorMemberId).toBe(
      'hidden-1',
    );
  });

  it('does not publish hidden members who are outside any tree', () => {
    expect(document?.members.map((member) => member.memberId)).not.toContain('5');
    expect(JSON.stringify(document)).not.toContain('Одинак');
  });

  it('never leaks hidden names or ids into graph.json', () => {
    const json = JSON.stringify(document);
    expect(json).not.toContain('Прихована');
    expect(json).not.toContain('"3"');
  });

  it('publishes a hidden founder under an opaque tree id', () => {
    const hiddenFounder = importMembership(
      records({
        members: [rawMember('1', { isHidden: true }), rawMember('2')],
        links: [rawLink('1', '2')],
      }),
      options,
    ).graphDocument;
    expect(hiddenFounder?.trees).toEqual([
      { treeId: 'hidden-1', founderMemberId: 'hidden-1', memberCount: 2 },
    ]);
    expect(hiddenFounder?.members.map((member) => member.treeId)).toEqual(['hidden-1', 'hidden-1']);
  });

  it('whitelists member and top-level fields', () => {
    expect(Object.keys(document ?? {}).sort()).toEqual([
      'cities',
      'members',
      'publishedAt',
      'schemaVersion',
      'settings',
      'trees',
    ]);
    for (const member of document?.members ?? []) {
      expect(Object.keys(member).sort()).toEqual(
        [
          'cityKey',
          'descendantCount',
          'fullName',
          'isHidden',
          'leadershipProgramYear',
          'memberId',
          'membershipLevel',
          'mentorMemberId',
          'treeId',
        ].sort(),
      );
    }
  });

  it('does not publish service settings', () => {
    const settings = importMembership(
      records({ settings: [{ sourceRow: 2, key: 'publishRequested', value: 'TRUE' }] }),
      options,
    ).graphDocument?.settings;
    expect(JSON.stringify(settings)).not.toContain('publishRequested');
    expect(JSON.stringify(settings)).not.toContain('memberCountDropAbortPercent');
  });

  it('is deterministic apart from publishedAt', () => {
    const again = importMembership(records(), { ...options, publishedAt: 'later' }).graphDocument;
    expect({ ...again, publishedAt: '' }).toEqual({ ...document, publishedAt: '' });
  });

  it('is fatal with no members left', () => {
    const empty = importMembership(records({ members: [rawMember('')], links: [] }), options);
    expect(empty.graphDocument).toBeNull();
    expect(empty.issues.at(-1)).toMatchObject({ code: 'FATAL', level: 'fatal' });
  });

  it('collects source, member, link and setting issues in a report', () => {
    const noisy = importMembership(
      records({
        links: [rawLink('1', '99')],
        settings: [{ sourceRow: 2, key: 'dimmedOpacity', value: '9' }],
        sourceIssues: [
          {
            level: 'error',
            code: 'UNRESOLVED_MENTOR',
            memberId: '9',
            memberName: 'X',
            sourceRow: 5,
            description: 'д',
          },
        ],
      }),
      options,
    );
    expect(noisy.issues.map((issue) => issue.code)).toEqual([
      'UNRESOLVED_MENTOR',
      'MENTEE_NOT_FOUND',
      'INVALID_SETTING',
    ]);
    const rows = formatImportReportRows({
      generatedAt: 'now',
      source: 'test',
      memberCount: 6,
      linkCount: 0,
      treeCount: 0,
      issues: noisy.issues,
    });
    expect(rows[5]).toEqual(['Помилок', '2']);
    expect(rows[6]).toEqual(['Попереджень', '1']);
    expect(rows[8]).toEqual(['Рівень', 'Код', 'ID учасника', 'Ім’я', 'Рядок у джерелі', 'Опис']);
    expect(rows[9]?.[1]).toBe('UNRESOLVED_MENTOR');
  });

  it('lists reference cities plus unknown ones used by visible members', () => {
    const withUnknown = importMembership(
      records({
        members: [rawMember('1', { city: 'Глухів' }), rawMember('2')],
        links: [rawLink('1', '2')],
      }),
      options,
    ).graphDocument;
    expect(withUnknown?.cities.map((city) => city.cityKey)).toEqual(['kyiv', 'lviv', 'unknown-1']);
  });
});
