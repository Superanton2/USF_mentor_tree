import { buildGraphIndex, type GraphDocument, type GraphMember } from '@mentor-tree/domain';
import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '../settings/userSettings';
import { buildMemberStyles, findYearColorScale } from './memberAppearance';

const member = (memberId: string, overrides: Partial<GraphMember> = {}): GraphMember => ({
  memberId,
  fullName: memberId,
  cityKey: 'kyiv',
  membershipLevel: 'coordinator',
  leadershipProgramYear: 2024,
  mentorMemberId: null,
  treeId: null,
  descendantCount: 0,
  isHidden: false,
  ...overrides,
});
const colors = {
  node: '#8C8C8C',
  link: '#3A3A3A',
  highlight: '#FFD600',
  yearNewest: '#FFD600',
  yearOldest: '#4A4A4A',
  region: { west: '#111111', center: '#222222', east: '#333333', south: '#444444' },
  level: {
    activist: '#AA0000',
    functionary: '#BB0000',
    coordinator: '#CC0000',
    'senior-coordinator': '#DD0000',
  },
  exportGradientStart: '#FFD600',
  exportGradientEnd: '#FFF1A6',
};
const index = buildGraphIndex({
  schemaVersion: 1,
  publishedAt: 'x',
  trees: [],
  cities: [{ cityKey: 'kyiv', names: { uk: 'Київ', en: 'Kyiv' }, region: 'center' }],
  settings: { colors } as GraphDocument['settings'],
  members: [
    member('a'),
    member('b', { leadershipProgramYear: 2020, cityKey: null, membershipLevel: null }),
    member('c', { leadershipProgramYear: null }),
  ],
});

describe('buildMemberStyles', () => {
  it('colors every member with the node color in uniform mode', () => {
    const styles = buildMemberStyles(index, DEFAULT_USER_SETTINGS);
    expect([...styles.values()].map((style) => style.fillColor)).toEqual([
      '#8C8C8C',
      '#8C8C8C',
      '#8C8C8C',
    ]);
  });
  it('colors by program year with the newest bright, the oldest dark, and no year as a ring', () => {
    const styles = buildMemberStyles(index, { ...DEFAULT_USER_SETTINGS, colorMode: 'programYear' });
    expect(styles.get('a')?.fillColor).toBe('#FFD600');
    expect(styles.get('b')?.fillColor).toBe('#4A4A4A');
    expect(styles.get('c')?.fillColor).toBeNull();
  });
  it('colors by region and level from the configured palette; missing data is a ring', () => {
    expect(
      buildMemberStyles(index, { ...DEFAULT_USER_SETTINGS, colorMode: 'region' }).get('a')
        ?.fillColor,
    ).toBe('#222222');
    expect(
      buildMemberStyles(index, { ...DEFAULT_USER_SETTINGS, colorMode: 'region' }).get('b')
        ?.fillColor,
    ).toBeNull();
    expect(
      buildMemberStyles(index, { ...DEFAULT_USER_SETTINGS, colorMode: 'level' }).get('a')
        ?.fillColor,
    ).toBe('#CC0000');
    expect(
      buildMemberStyles(index, { ...DEFAULT_USER_SETTINGS, colorMode: 'level' }).get('b')
        ?.fillColor,
    ).toBeNull();
  });
  it('flags members that do not match the filters', () => {
    const styles = buildMemberStyles(index, {
      ...DEFAULT_USER_SETTINGS,
      filters: { ...DEFAULT_USER_SETTINGS.filters, programYears: [2024] },
    });
    expect([
      styles.get('a')?.matchesFilters,
      styles.get('b')?.matchesFilters,
      styles.get('c')?.matchesFilters,
    ]).toEqual([true, false, false]);
  });
});

describe('findYearColorScale', () => {
  it('spans the years in the data', () => {
    expect(findYearColorScale(index)).toMatchObject({ oldestYear: 2020, newestYear: 2024 });
  });
  it('is null without any year', () => {
    expect(
      findYearColorScale(
        buildGraphIndex({
          ...index.document,
          members: [member('x', { leadershipProgramYear: null })],
        }),
      ),
    ).toBeNull();
  });
});
