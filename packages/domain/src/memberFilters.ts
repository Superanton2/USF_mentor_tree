import type { GraphCity, GraphMember } from './graphDocument';
import type { MembershipLevel, Region } from './membershipTypes';

/** Marks "members without a program year" in the year filter. */
export const NO_PROGRAM_YEAR = 'none';
export type ProgramYearFilterValue = number | typeof NO_PROGRAM_YEAR;

/** Several values inside one category mean "any of them"; categories combine with "and". */
export interface MemberFilters {
  regions: Region[];
  cityKeys: string[];
  levels: MembershipLevel[];
  programYears: ProgramYearFilterValue[];
}

export const EMPTY_MEMBER_FILTERS: MemberFilters = {
  regions: [],
  cityKeys: [],
  levels: [],
  programYears: [],
};

export function hasActiveFilters(filters: MemberFilters): boolean {
  return (
    filters.regions.length > 0 ||
    filters.cityKeys.length > 0 ||
    filters.levels.length > 0 ||
    filters.programYears.length > 0
  );
}

/** Hidden members carry no attributes, so they never match an active filter. */
export function matchesMemberFilters(
  member: GraphMember,
  city: GraphCity | undefined,
  filters: MemberFilters,
): boolean {
  if (filters.regions.length > 0 && !(city?.region && filters.regions.includes(city.region)))
    return false;
  if (filters.cityKeys.length > 0 && !(member.cityKey && filters.cityKeys.includes(member.cityKey)))
    return false;
  if (
    filters.levels.length > 0 &&
    !(member.membershipLevel && filters.levels.includes(member.membershipLevel))
  )
    return false;
  if (filters.programYears.length > 0) {
    const value = member.leadershipProgramYear ?? NO_PROGRAM_YEAR;
    if (member.isHidden || !filters.programYears.includes(value)) return false;
  }
  return true;
}

/** Years present in the data, newest first (for the year chips). */
export function listProgramYears(members: readonly GraphMember[]): number[] {
  const years = new Set<number>();
  for (const member of members) {
    if (member.leadershipProgramYear !== null) years.add(member.leadershipProgramYear);
  }
  return [...years].sort((first, second) => second - first);
}

/** Cities by number of people, most populous first; ties by name for a stable order. */
export function listCitiesByMemberCount(
  members: readonly GraphMember[],
  cities: readonly GraphCity[],
): { city: GraphCity; memberCount: number }[] {
  const counts = new Map<string, number>();
  for (const member of members) {
    if (member.cityKey !== null) counts.set(member.cityKey, (counts.get(member.cityKey) ?? 0) + 1);
  }
  return cities
    .filter((city) => counts.has(city.cityKey))
    .map((city) => ({ city, memberCount: counts.get(city.cityKey) ?? 0 }))
    .sort(
      (first, second) =>
        second.memberCount - first.memberCount ||
        first.city.names.uk.localeCompare(second.city.names.uk, 'uk'),
    );
}

/** Biggest trees first; ties keep the data order. */
export function listLargestTrees<Tree extends { memberCount: number }>(
  trees: readonly Tree[],
  count: number,
): Tree[] {
  return [...trees].sort((first, second) => second.memberCount - first.memberCount).slice(0, count);
}
