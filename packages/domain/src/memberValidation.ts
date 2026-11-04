import type { CityReference } from './cityReference';
import { createImportIssue, type ImportIssue } from './importIssue';
import {
  FIRST_LEADERSHIP_PROGRAM_YEAR,
  MEMBERSHIP_LEVEL_BY_LABEL,
  REGION_BY_LABEL,
  type City,
  type Member,
  type MembershipLevel,
  type RawMemberRecord,
} from './membershipTypes';

export interface MemberValidationResult {
  members: Member[];
  issues: ImportIssue[];
}

const FOUR_DIGIT_YEAR = /^\d{4}$/;

export function validateMembers(
  records: readonly RawMemberRecord[],
  cityReference: CityReference,
  currentYear: number,
): MemberValidationResult {
  const members: Member[] = [];
  const issues: ImportIssue[] = [];
  const seenMemberIds = new Set<string>();
  const unknownCitiesByName = new Map<string, City>();

  for (const record of records) {
    const memberId = record.memberId.trim();
    const fullName = record.fullName.trim().replaceAll(/\s+/g, ' ');
    const identity = { memberId, memberName: fullName, sourceRow: record.sourceRow };

    if (memberId === '') {
      issues.push(
        createImportIssue({
          ...identity,
          code: 'MISSING_MEMBER_ID',
          description: `Не вказано ID учасника «${fullName}» — рядок пропущено.`,
        }),
      );
      continue;
    }
    if (seenMemberIds.has(memberId)) {
      issues.push(
        createImportIssue({
          ...identity,
          code: 'DUPLICATE_MEMBER_ID',
          description: `ID ${memberId} уже використано вище — цей рядок пропущено. Кожен учасник має мати унікальний ID.`,
        }),
      );
      continue;
    }
    if (fullName === '') {
      issues.push(
        createImportIssue({
          ...identity,
          code: 'MISSING_NAME',
          description: `Не вказано ім'я або прізвище учасника з ID ${memberId} — рядок пропущено.`,
        }),
      );
      continue;
    }
    seenMemberIds.add(memberId);

    const city = resolveCity(record, identity, cityReference, unknownCitiesByName, issues);
    members.push({
      memberId,
      fullName,
      city,
      membershipLevel: resolveLevel(record, identity, issues),
      leadershipProgramYear: resolveProgramYear(record, identity, currentYear, issues),
      isHidden: record.isHidden,
      sourceRow: record.sourceRow,
    });
  }
  return { members, issues };
}

interface MemberIdentity {
  memberId: string;
  memberName: string;
  sourceRow: number;
}

function resolveCity(
  record: RawMemberRecord,
  identity: MemberIdentity,
  cityReference: CityReference,
  unknownCitiesByName: Map<string, City>,
  issues: ImportIssue[],
): City | null {
  const cityName = record.city.trim();
  if (cityName === '') return null;

  const knownCity = cityReference.findByUkrainianName(cityName);
  if (knownCity) {
    const regionFromRow = REGION_BY_LABEL[record.region.trim()];
    if (record.region.trim() !== '' && regionFromRow !== knownCity.region) {
      issues.push(
        createImportIssue({
          ...identity,
          code: 'REGION_MISMATCH',
          description: `Регіон «${record.region}» не збігається з довідником для міста «${cityName}» — використано регіон з довідника.`,
        }),
      );
    }
    return knownCity;
  }

  issues.push(
    createImportIssue({
      ...identity,
      code: 'UNKNOWN_CITY',
      description: `Міста «${cityName}» немає в довіднику «Міста» — воно показується як є, без перекладу та регіону.`,
    }),
  );
  const existingUnknownCity = unknownCitiesByName.get(cityName);
  if (existingUnknownCity) return existingUnknownCity;
  const unknownCity: City = {
    cityKey: `unknown-${unknownCitiesByName.size + 1}`,
    names: { uk: cityName, en: cityName },
    region: null,
  };
  unknownCitiesByName.set(cityName, unknownCity);
  return unknownCity;
}

function resolveLevel(
  record: RawMemberRecord,
  identity: MemberIdentity,
  issues: ImportIssue[],
): MembershipLevel | null {
  const label = record.level.trim();
  if (label === '') return null;
  const level = MEMBERSHIP_LEVEL_BY_LABEL[label];
  if (level) return level;
  issues.push(
    createImportIssue({
      ...identity,
      code: 'UNKNOWN_LEVEL',
      description: `Невідомий рівень «${label}» — значення очищено. Оберіть рівень зі списку.`,
    }),
  );
  return null;
}

function resolveProgramYear(
  record: RawMemberRecord,
  identity: MemberIdentity,
  currentYear: number,
  issues: ImportIssue[],
): number | null {
  const text = record.leadershipProgramYear.trim();
  if (text === '') return null;
  const year = FOUR_DIGIT_YEAR.test(text) ? Number(text) : Number.NaN;
  if (year >= FIRST_LEADERSHIP_PROGRAM_YEAR && year <= currentYear) return year;
  issues.push(
    createImportIssue({
      ...identity,
      code: 'INVALID_PROGRAM_YEAR',
      description: `Рік ПЛ «${text}» некоректний (має бути від ${FIRST_LEADERSHIP_PROGRAM_YEAR} до ${currentYear}) — значення очищено.`,
    }),
  );
  return null;
}
