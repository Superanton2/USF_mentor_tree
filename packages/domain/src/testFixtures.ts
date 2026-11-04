import { buildCityReference } from './cityReference';
import type { RawMemberRecord, RawMentorshipLinkRecord } from './membershipTypes';

export const CITY_REFERENCE = buildCityReference([
  { sourceRow: 2, ukrainianName: 'Київ', englishName: 'Kyiv', region: 'Центр' },
  { sourceRow: 3, ukrainianName: 'Львів', englishName: 'Lviv', region: 'Захід' },
  { sourceRow: 4, ukrainianName: 'Кривий Ріг', englishName: 'Kryvyi Rih', region: 'Південь' },
]).reference;

export function rawMember(
  memberId: string,
  overrides: Partial<RawMemberRecord> = {},
): RawMemberRecord {
  return {
    sourceRow: Number(memberId) + 1 || 2,
    memberId,
    fullName: `Person ${memberId}`,
    city: 'Київ',
    region: '',
    level: 'Активіст',
    leadershipProgramYear: '2023',
    isHidden: false,
    ...overrides,
  };
}

export function rawLink(mentorMemberId: string, menteeMemberId: string): RawMentorshipLinkRecord {
  return { sourceRow: 2, mentorMemberId, menteeMemberId };
}
