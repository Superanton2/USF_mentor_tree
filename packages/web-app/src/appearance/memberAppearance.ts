import {
  EMPTY_MEMBER_FILTERS,
  computeYearColor,
  matchesMemberFilters,
  type GraphIndex,
  type YearColorScale,
} from '@mentor-tree/domain';
import type { MemberStyle } from '../graph/GraphRenderer';
import type { UserSettings } from '../settings/userSettings';

/** Years in the data define the ends of the "by program year" gradient. */
export function findYearColorScale(index: GraphIndex): YearColorScale | null {
  const years = index.document.members.flatMap((member) =>
    member.leadershipProgramYear === null ? [] : [member.leadershipProgramYear],
  );
  if (years.length === 0) return null;
  const { colors } = index.document.settings;
  return {
    oldestYear: Math.min(...years),
    newestYear: Math.max(...years),
    oldestColor: colors.yearOldest,
    newestColor: colors.yearNewest,
  };
}

/**
 * Fill color and filter match for every member. `fillColor: null` means "no data for this
 * mode": drawn as an empty ring (SPEC 7.8).
 */
export function buildMemberStyles(
  index: GraphIndex,
  settings: UserSettings,
): Map<string, MemberStyle> {
  const { colors } = index.document.settings;
  const yearScale = findYearColorScale(index);
  const styles = new Map<string, MemberStyle>();

  for (const member of index.document.members) {
    const city = member.cityKey === null ? undefined : index.citiesByKey.get(member.cityKey);
    let fillColor: string | null;
    switch (settings.colorMode) {
      case 'uniform':
        fillColor = colors.node;
        break;
      case 'programYear':
        fillColor =
          member.leadershipProgramYear === null || yearScale === null
            ? null
            : computeYearColor(member.leadershipProgramYear, yearScale);
        break;
      case 'region':
        fillColor = city?.region ? colors.region[city.region] : null;
        break;
      case 'level':
        fillColor = member.membershipLevel ? colors.level[member.membershipLevel] : null;
        break;
    }
    styles.set(member.memberId, {
      fillColor,
      matchesFilters: matchesMemberFilters(member, city, settings.filters ?? EMPTY_MEMBER_FILTERS),
    });
  }
  return styles;
}
