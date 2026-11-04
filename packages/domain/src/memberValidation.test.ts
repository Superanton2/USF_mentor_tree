import { describe, expect, it } from 'vitest';
import { buildCityReference } from './cityReference';
import { validateMembers } from './memberValidation';
import { CITY_REFERENCE, rawMember } from './testFixtures';

const validate = (...records: Parameters<typeof validateMembers>[0]) =>
  validateMembers(records, CITY_REFERENCE, 2026);

describe('validateMembers', () => {
  it('maps a clean record', () => {
    const { members, issues } = validate(rawMember('1', { level: 'Старший координатор' }));
    expect(issues).toEqual([]);
    expect(members[0]).toMatchObject({
      memberId: '1',
      membershipLevel: 'senior-coordinator',
      leadershipProgramYear: 2023,
      city: { cityKey: 'kyiv', region: 'center' },
    });
  });

  it('skips rows without id (MISSING_MEMBER_ID)', () => {
    const { members, issues } = validate(rawMember(' '));
    expect(members).toEqual([]);
    expect(issues.map((issue) => issue.code)).toEqual(['MISSING_MEMBER_ID']);
  });

  it('keeps the first of duplicate ids (DUPLICATE_MEMBER_ID)', () => {
    const { members, issues } = validate(rawMember('1'), rawMember('1', { fullName: 'Other' }));
    expect(members.map((member) => member.fullName)).toEqual(['Person 1']);
    expect(issues[0]).toMatchObject({ code: 'DUPLICATE_MEMBER_ID', level: 'error' });
  });

  it('skips rows without name (MISSING_NAME)', () => {
    const { members, issues } = validate(rawMember('1', { fullName: '  ' }));
    expect(members).toEqual([]);
    expect(issues[0]?.code).toBe('MISSING_NAME');
  });

  it('shows unknown cities as is (UNKNOWN_CITY warning) and reuses their key', () => {
    const { members, issues } = validate(
      rawMember('1', { city: 'Глухів' }),
      rawMember('2', { city: 'Глухів' }),
    );
    expect(issues.map((issue) => [issue.code, issue.level])).toEqual([
      ['UNKNOWN_CITY', 'warning'],
      ['UNKNOWN_CITY', 'warning'],
    ]);
    expect(members[0]?.city).toEqual({
      cityKey: 'unknown-1',
      names: { uk: 'Глухів', en: 'Глухів' },
      region: null,
    });
    expect(members[1]?.city?.cityKey).toBe('unknown-1');
  });

  it('lets the reference win on region mismatch (REGION_MISMATCH)', () => {
    const { members, issues } = validate(rawMember('1', { region: 'Схід' }));
    expect(members[0]?.city?.region).toBe('center');
    expect(issues[0]?.code).toBe('REGION_MISMATCH');
  });

  it('accepts empty region and matching region silently', () => {
    expect(
      validate(rawMember('1', { region: '' }), rawMember('2', { region: 'Центр' })).issues,
    ).toEqual([]);
  });

  it('treats an empty city as no city without issue', () => {
    const { members, issues } = validate(rawMember('1', { city: '' }));
    expect(members[0]?.city).toBeNull();
    expect(issues).toEqual([]);
  });

  it('clears unknown level (UNKNOWN_LEVEL) and accepts empty level', () => {
    const { members, issues } = validate(
      rawMember('1', { level: 'Бос' }),
      rawMember('2', { level: '' }),
    );
    expect(members.map((member) => member.membershipLevel)).toEqual([null, null]);
    expect(issues.map((issue) => issue.code)).toEqual(['UNKNOWN_LEVEL']);
  });

  it.each(['2014', '2027', 'abc', '20.5'])('clears invalid program year %s', (year) => {
    const { members, issues } = validate(rawMember('1', { leadershipProgramYear: year }));
    expect(members[0]?.leadershipProgramYear).toBeNull();
    expect(issues[0]?.code).toBe('INVALID_PROGRAM_YEAR');
  });

  it('accepts boundary years 2015 and the current year', () => {
    const { issues } = validate(
      rawMember('1', { leadershipProgramYear: '2015' }),
      rawMember('2', { leadershipProgramYear: '2026' }),
    );
    expect(issues).toEqual([]);
  });
});

describe('buildCityReference', () => {
  it('skips broken rows, ignores duplicates and builds keys from English names', () => {
    const { reference, issues } = buildCityReference([
      { sourceRow: 2, ukrainianName: 'Кривий Ріг', englishName: 'Kryvyi Rih', region: 'Південь' },
      { sourceRow: 3, ukrainianName: 'Кривий Ріг', englishName: 'Other', region: 'Південь' },
      { sourceRow: 4, ukrainianName: 'Х', englishName: 'X', region: 'Марс' },
    ]);
    expect(reference.cities.map((city) => city.cityKey)).toEqual(['kryvyi-rih']);
    expect(issues).toHaveLength(1);
    expect(reference.findByUkrainianName(' Кривий Ріг ')?.names.en).toBe('Kryvyi Rih');
  });
});
