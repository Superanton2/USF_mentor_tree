import type { MentorshipForest } from './treeBuilding';
import type { City, Member, MembershipLevel, Region } from './membershipTypes';
import type { Settings } from './settingsParsing';

export const GRAPH_SCHEMA_VERSION = 1;

/** Public contract of graph.json (SPEC 5.5). Only these fields may ever be published. */
export interface GraphMember {
  memberId: string;
  /** null for hidden members: the interface shows "Учасник УСС". */
  fullName: string | null;
  cityKey: string | null;
  membershipLevel: MembershipLevel | null;
  leadershipProgramYear: number | null;
  mentorMemberId: string | null;
  treeId: string | null;
  descendantCount: number;
  isHidden: boolean;
}

export interface GraphTree {
  treeId: string;
  founderMemberId: string;
  memberCount: number;
}

export interface GraphCity {
  cityKey: string;
  names: { uk: string; en: string };
  region: Region | null;
}

export interface GraphSettings {
  formUrl: string | null;
  largestTreesCount: number;
  labelZoomThreshold: number;
  showMembersWithoutConnections: boolean;
  dimmedOpacity: number;
  colors: {
    node: string;
    link: string;
    highlight: string;
    yearNewest: string;
    yearOldest: string;
    region: Record<Region, string>;
    level: Record<MembershipLevel, string>;
    exportGradientStart: string;
    exportGradientEnd: string;
  };
}

export interface GraphDocument {
  schemaVersion: number;
  publishedAt: string;
  members: GraphMember[];
  trees: GraphTree[];
  cities: GraphCity[];
  settings: GraphSettings;
}

export interface GraphDocumentInput {
  members: readonly Member[];
  forest: MentorshipForest;
  referenceCities: readonly City[];
  settings: Settings;
  publishedAt: string;
}

const HIDDEN_ID_PREFIX = 'hidden-';

export function buildGraphDocument(input: GraphDocumentInput): GraphDocument {
  const { members, forest, referenceCities, settings, publishedAt } = input;
  const publicIdByMemberId = assignPublicIds(members, forest);

  const publicMembers: GraphMember[] = [];
  for (const member of members) {
    const treeId = forest.treeIdByMemberId.get(member.memberId) ?? null;
    // Hidden members outside any tree carry no information, so they are not published at all.
    if (member.isHidden && treeId === null) continue;

    const mentorId = forest.mentorIdByMenteeId.get(member.memberId);
    const mentorMemberId =
      mentorId === undefined ? null : (publicIdByMemberId.get(mentorId) ?? null);
    const memberId = publicIdByMemberId.get(member.memberId) ?? member.memberId;
    const publicTreeId = treeId === null ? null : (publicIdByMemberId.get(treeId) ?? treeId);
    const descendantCount = forest.descendantCountByMemberId.get(member.memberId) ?? 0;

    publicMembers.push(
      member.isHidden
        ? {
            memberId,
            fullName: null,
            cityKey: null,
            membershipLevel: null,
            leadershipProgramYear: null,
            mentorMemberId,
            treeId: publicTreeId,
            descendantCount,
            isHidden: true,
          }
        : {
            memberId,
            fullName: member.fullName,
            cityKey: member.city?.cityKey ?? null,
            membershipLevel: member.membershipLevel,
            leadershipProgramYear: member.leadershipProgramYear,
            mentorMemberId,
            treeId: publicTreeId,
            descendantCount,
            isHidden: false,
          },
    );
  }

  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    publishedAt,
    members: publicMembers,
    trees: forest.trees.map((tree) => ({
      treeId: publicIdByMemberId.get(tree.treeId) ?? tree.treeId,
      founderMemberId: publicIdByMemberId.get(tree.founderMemberId) ?? tree.founderMemberId,
      memberCount: tree.memberCount,
    })),
    cities: collectPublishedCities(members, referenceCities),
    settings: buildGraphSettings(settings),
  };
}

/** Hidden members get opaque ids numbered in source order; everyone else keeps their own id. */
function assignPublicIds(
  members: readonly Member[],
  forest: MentorshipForest,
): Map<string, string> {
  const publicIdByMemberId = new Map<string, string>();
  let hiddenCount = 0;
  for (const member of members) {
    const isInTree = (forest.treeIdByMemberId.get(member.memberId) ?? null) !== null;
    if (member.isHidden && isInTree) {
      hiddenCount++;
      publicIdByMemberId.set(member.memberId, `${HIDDEN_ID_PREFIX}${hiddenCount}`);
    } else {
      publicIdByMemberId.set(member.memberId, member.memberId);
    }
  }
  return publicIdByMemberId;
}

function collectPublishedCities(
  members: readonly Member[],
  referenceCities: readonly City[],
): GraphCity[] {
  const citiesByKey = new Map<string, City>(referenceCities.map((city) => [city.cityKey, city]));
  for (const member of members) {
    if (member.city && !member.isHidden) citiesByKey.set(member.city.cityKey, member.city);
  }
  return [...citiesByKey.values()].map(({ cityKey, names, region }) => ({
    cityKey,
    names,
    region,
  }));
}

function buildGraphSettings(settings: Settings): GraphSettings {
  return {
    formUrl: settings.formUrl,
    largestTreesCount: settings.largestTreesCount,
    labelZoomThreshold: settings.labelZoomThreshold,
    showMembersWithoutConnections: settings.showMembersWithoutConnections,
    dimmedOpacity: settings.dimmedOpacity,
    colors: {
      node: settings.colorNode,
      link: settings.colorLink,
      highlight: settings.colorHighlight,
      yearNewest: settings.yearColorNewest,
      yearOldest: settings.yearColorOldest,
      region: {
        west: settings.regionColorWest,
        center: settings.regionColorCenter,
        east: settings.regionColorEast,
        south: settings.regionColorSouth,
      },
      level: {
        activist: settings.levelColorActivist,
        functionary: settings.levelColorFunctionary,
        coordinator: settings.levelColorCoordinator,
        'senior-coordinator': settings.levelColorSeniorCoordinator,
      },
      exportGradientStart: settings.exportGradientStart,
      exportGradientEnd: settings.exportGradientEnd,
    },
  };
}
