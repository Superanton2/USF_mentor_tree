import type { GraphCity, GraphDocument, GraphMember, GraphTree } from './graphDocument';
import { matchesSearchQuery, normalizeSearchText, rankSearchMatch } from './searchNormalization';

export interface GraphIndex {
  document: GraphDocument;
  membersById: Map<string, GraphMember>;
  treesById: Map<string, GraphTree>;
  citiesByKey: Map<string, GraphCity>;
  menteesByMentorId: Map<string, GraphMember[]>;
  /** Members that can be found by name: hidden members are excluded (SPEC 7.5). */
  searchEntries: { member: GraphMember; normalizedName: string }[];
}

export function buildGraphIndex(document: GraphDocument): GraphIndex {
  const menteesByMentorId = new Map<string, GraphMember[]>();
  for (const member of document.members) {
    if (member.mentorMemberId === null) continue;
    const mentees = menteesByMentorId.get(member.mentorMemberId) ?? [];
    mentees.push(member);
    menteesByMentorId.set(member.mentorMemberId, mentees);
  }
  return {
    document,
    membersById: new Map(document.members.map((member) => [member.memberId, member])),
    treesById: new Map(document.trees.map((tree) => [tree.treeId, tree])),
    citiesByKey: new Map(document.cities.map((city) => [city.cityKey, city])),
    menteesByMentorId,
    searchEntries: document.members.flatMap((member) =>
      member.fullName === null || member.isHidden
        ? []
        : [{ member, normalizedName: normalizeSearchText(member.fullName) }],
    ),
  };
}

export const DEFAULT_SEARCH_RESULT_LIMIT = 8;

export function searchMembers(
  index: GraphIndex,
  query: string,
  limit = DEFAULT_SEARCH_RESULT_LIMIT,
): GraphMember[] {
  const normalizedQuery = normalizeSearchText(query);
  return index.searchEntries
    .filter((entry) => matchesSearchQuery(entry.normalizedName, normalizedQuery))
    .map((entry) => ({ ...entry, rank: rankSearchMatch(entry.normalizedName, normalizedQuery) }))
    .sort(
      (first, second) =>
        first.rank - second.rank || first.normalizedName.localeCompare(second.normalizedName, 'uk'),
    )
    .slice(0, limit)
    .map((entry) => entry.member);
}

export function findTreeFounder(index: GraphIndex, treeId: string): GraphMember | null {
  const tree = index.treesById.get(treeId);
  return tree ? (index.membersById.get(tree.founderMemberId) ?? null) : null;
}

export function listTreeMembers(index: GraphIndex, treeId: string): GraphMember[] {
  return index.document.members.filter((member) => member.treeId === treeId);
}

export function listMentees(index: GraphIndex, memberId: string): GraphMember[] {
  return index.menteesByMentorId.get(memberId) ?? [];
}

/** Founder → … → member, following mentors upwards. Stops at the first missing mentor. */
export function listPathFromFounder(index: GraphIndex, memberId: string): GraphMember[] {
  const path: GraphMember[] = [];
  const visitedIds = new Set<string>();
  let current = index.membersById.get(memberId);
  while (current && !visitedIds.has(current.memberId)) {
    visitedIds.add(current.memberId);
    path.push(current);
    current =
      current.mentorMemberId === null ? undefined : index.membersById.get(current.mentorMemberId);
  }
  return path.reverse();
}
