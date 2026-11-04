import { describe, expect, it } from 'vitest';
import { validateLinks } from './linkValidation';
import { validateMembers } from './memberValidation';
import { CITY_REFERENCE, rawLink, rawMember } from './testFixtures';

const members = validateMembers(
  ['1', '2', '3', '4', '5'].map((id) => rawMember(id)),
  CITY_REFERENCE,
  2026,
).members;

const codes = (result: ReturnType<typeof validateLinks>) =>
  result.issues.map((issue) => issue.code);

describe('validateLinks', () => {
  it('accepts valid links', () => {
    const result = validateLinks([rawLink('1', '2'), rawLink('2', '3')], members);
    expect(result.links).toEqual([
      { mentorMemberId: '1', menteeMemberId: '2' },
      { mentorMemberId: '2', menteeMemberId: '3' },
    ]);
    expect(result.issues).toEqual([]);
  });

  it('reports a missing mentor (MENTOR_NOT_FOUND)', () => {
    const result = validateLinks([rawLink('99', '2')], members);
    expect(result.links).toEqual([]);
    expect(codes(result)).toEqual(['MENTOR_NOT_FOUND']);
  });

  it('reports a missing mentee (MENTEE_NOT_FOUND)', () => {
    expect(codes(validateLinks([rawLink('1', '')], members))).toEqual(['MENTEE_NOT_FOUND']);
  });

  it('reports both when both are missing', () => {
    expect(codes(validateLinks([rawLink('98', '99')], members))).toEqual([
      'MENTOR_NOT_FOUND',
      'MENTEE_NOT_FOUND',
    ]);
  });

  it('rejects self mentorship (SELF_MENTORSHIP)', () => {
    const result = validateLinks([rawLink('2', '2')], members);
    expect(result.links).toEqual([]);
    expect(codes(result)).toEqual(['SELF_MENTORSHIP']);
  });

  it('keeps one of duplicate links with a warning (DUPLICATE_LINK)', () => {
    const result = validateLinks([rawLink('1', '2'), rawLink('1', '2')], members);
    expect(result.links).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ code: 'DUPLICATE_LINK', level: 'warning' });
  });

  it('drops all links of a mentee with several mentors (MULTIPLE_MENTORS)', () => {
    const result = validateLinks(
      [rawLink('1', '3'), rawLink('2', '3'), rawLink('1', '4')],
      members,
    );
    expect(result.links).toEqual([{ mentorMemberId: '1', menteeMemberId: '4' }]);
    expect(codes(result)).toEqual(['MULTIPLE_MENTORS']);
    expect(result.issues[0]?.memberId).toBe('3');
  });

  it('drops every link of a cycle but keeps branches hanging off it (MENTORSHIP_CYCLE)', () => {
    const result = validateLinks(
      [rawLink('1', '2'), rawLink('2', '3'), rawLink('3', '1'), rawLink('3', '4')],
      members,
    );
    expect(result.links).toEqual([{ mentorMemberId: '3', menteeMemberId: '4' }]);
    expect(codes(result)).toEqual(['MENTORSHIP_CYCLE']);
    expect(result.issues[0]?.description).toContain('Person 1');
  });

  it('finds several independent cycles', () => {
    const result = validateLinks(
      [rawLink('1', '2'), rawLink('2', '1'), rawLink('3', '4'), rawLink('4', '3')],
      members,
    );
    expect(result.links).toEqual([]);
    expect(codes(result)).toEqual(['MENTORSHIP_CYCLE', 'MENTORSHIP_CYCLE']);
  });
});
