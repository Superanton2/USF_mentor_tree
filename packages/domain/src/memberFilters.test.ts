import { describe, expect, it } from 'vitest';
import type { GraphCity, GraphMember } from './graphDocument';
import {
  EMPTY_MEMBER_FILTERS,
  NO_PROGRAM_YEAR,
  hasActiveFilters,
  listCitiesByMemberCount,
  listLargestTrees,
  listProgramYears,
  matchesMemberFilters,
} from './memberFilters';

const kyiv: GraphCity = { cityKey: 'kyiv', names: { uk: 'Київ', en: 'Kyiv' }, region: 'center' };
const lviv: GraphCity = { cityKey: 'lviv', names: { uk: 'Львів', en: 'Lviv' }, region: 'west' };
const member = (overrides: Partial<GraphMember> = {}): GraphMember => ({
  memberId: '1',
  fullName: 'A B',
  cityKey: 'kyiv',
  membershipLevel: 'activist',
  leadershipProgramYear: 2023,
  mentorMemberId: null,
  treeId: null,
  descendantCount: 0,
  isHidden: false,
  ...overrides,
});

describe('matchesMemberFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(hasActiveFilters(EMPTY_MEMBER_FILTERS)).toBe(false);
    expect(matchesMemberFilters(member(), kyiv, EMPTY_MEMBER_FILTERS)).toBe(true);
  });
  it('uses "any of" inside a category and "and" between categories', () => {
    const filters = {
      ...EMPTY_MEMBER_FILTERS,
      regions: ['center' as const, 'west' as const],
      levels: ['activist' as const],
    };
    expect(hasActiveFilters(filters)).toBe(true);
    expect(matchesMemberFilters(member(), kyiv, filters)).toBe(true);
    expect(matchesMemberFilters(member({ cityKey: 'lviv' }), lviv, filters)).toBe(true);
    expect(matchesMemberFilters(member({ membershipLevel: 'coordinator' }), kyiv, filters)).toBe(
      false,
    );
    expect(matchesMemberFilters(member(), { ...kyiv, region: 'east' }, filters)).toBe(false);
  });
  it('filters by city and by program year, including "no year"', () => {
    expect(
      matchesMemberFilters(member(), kyiv, { ...EMPTY_MEMBER_FILTERS, cityKeys: ['lviv'] }),
    ).toBe(false);
    expect(
      matchesMemberFilters(member(), kyiv, { ...EMPTY_MEMBER_FILTERS, programYears: [2023] }),
    ).toBe(true);
    expect(
      matchesMemberFilters(member({ leadershipProgramYear: null }), kyiv, {
        ...EMPTY_MEMBER_FILTERS,
        programYears: [NO_PROGRAM_YEAR],
      }),
    ).toBe(true);
    expect(
      matchesMemberFilters(member({ leadershipProgramYear: null }), kyiv, {
        ...EMPTY_MEMBER_FILTERS,
        programYears: [2023],
      }),
    ).toBe(false);
  });
  it('never matches hidden members while a filter is active', () => {
    const hidden = member({
      isHidden: true,
      cityKey: null,
      membershipLevel: null,
      leadershipProgramYear: null,
    });
    expect(
      matchesMemberFilters(hidden, undefined, {
        ...EMPTY_MEMBER_FILTERS,
        programYears: [NO_PROGRAM_YEAR],
      }),
    ).toBe(false);
    expect(
      matchesMemberFilters(hidden, undefined, { ...EMPTY_MEMBER_FILTERS, regions: ['west'] }),
    ).toBe(false);
  });
});

describe('lists', () => {
  const members = [
    member({ memberId: '1' }),
    member({ memberId: '2', cityKey: 'lviv', leadershipProgramYear: 2021 }),
    member({ memberId: '3' }),
    member({ memberId: '4', cityKey: null, leadershipProgramYear: null }),
  ];
  it('lists years newest first', () => expect(listProgramYears(members)).toEqual([2023, 2021]));
  it('lists cities by population', () => {
    expect(
      listCitiesByMemberCount(members, [lviv, kyiv]).map((entry) => [
        entry.city.cityKey,
        entry.memberCount,
      ]),
    ).toEqual([
      ['kyiv', 2],
      ['lviv', 1],
    ]);
  });
  it('lists the largest trees', () => {
    expect(
      listLargestTrees([{ memberCount: 3 }, { memberCount: 9 }, { memberCount: 5 }], 2),
    ).toEqual([{ memberCount: 9 }, { memberCount: 5 }]);
  });
});
