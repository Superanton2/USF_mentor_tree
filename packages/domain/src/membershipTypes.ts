export const MEMBERSHIP_LEVELS = [
  'activist',
  'functionary',
  'coordinator',
  'senior-coordinator',
] as const;
export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];

export const REGIONS = ['west', 'center', 'east', 'south'] as const;
export type Region = (typeof REGIONS)[number];

/** Ukrainian labels as they appear in the Google spreadsheet and the legacy CSV. */
export const MEMBERSHIP_LEVEL_BY_LABEL: Record<string, MembershipLevel> = {
  Активіст: 'activist',
  Функціонер: 'functionary',
  Координатор: 'coordinator',
  'Старший координатор': 'senior-coordinator',
};

export const REGION_BY_LABEL: Record<string, Region> = {
  Захід: 'west',
  Центр: 'center',
  Схід: 'east',
  Південь: 'south',
};

export const FIRST_LEADERSHIP_PROGRAM_YEAR = 2015;

export interface City {
  cityKey: string;
  names: { uk: string; en: string };
  /** null only for cities missing from the reference list (UNKNOWN_CITY). */
  region: Region | null;
}

/** A membership row exactly as read from a data source, before any validation. */
export interface RawMemberRecord {
  sourceRow: number;
  memberId: string;
  fullName: string;
  city: string;
  region: string;
  level: string;
  leadershipProgramYear: string;
  isHidden: boolean;
}

export interface RawMentorshipLinkRecord {
  sourceRow: number;
  mentorMemberId: string;
  menteeMemberId: string;
}

export interface RawCityRecord {
  sourceRow: number;
  ukrainianName: string;
  englishName: string;
  region: string;
}

export interface RawSettingRecord {
  sourceRow: number;
  key: string;
  value: string;
}

export interface Member {
  memberId: string;
  fullName: string;
  city: City | null;
  membershipLevel: MembershipLevel | null;
  leadershipProgramYear: number | null;
  isHidden: boolean;
  sourceRow: number;
}

export interface MentorshipLink {
  mentorMemberId: string;
  menteeMemberId: string;
}
