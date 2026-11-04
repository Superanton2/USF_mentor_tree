import type { Member, MentorshipLink } from './membershipTypes';

export interface MentorshipTreeSummary {
  /** Equals the founder's memberId, which keeps links stable between releases. */
  treeId: string;
  founderMemberId: string;
  memberCount: number;
}

export interface MentorshipForest {
  trees: MentorshipTreeSummary[];
  /** memberId → treeId; null for members without a tree. */
  treeIdByMemberId: Map<string, string | null>;
  mentorIdByMenteeId: Map<string, string>;
  menteeIdsByMentorId: Map<string, string[]>;
  descendantCountByMemberId: Map<string, number>;
  /** Depth inside the tree, founder = 1. Used only for layout. */
  generationByMemberId: Map<string, number>;
}

/** `links` must already be validated: one mentor per mentee, no cycles. */
export function buildMentorshipForest(
  members: readonly Member[],
  links: readonly MentorshipLink[],
): MentorshipForest {
  const mentorIdByMenteeId = new Map<string, string>();
  const menteeIdsByMentorId = new Map<string, string[]>();
  for (const link of links) {
    mentorIdByMenteeId.set(link.menteeMemberId, link.mentorMemberId);
    const menteeIds = menteeIdsByMentorId.get(link.mentorMemberId) ?? [];
    menteeIds.push(link.menteeMemberId);
    menteeIdsByMentorId.set(link.mentorMemberId, menteeIds);
  }

  const treeIdByMemberId = new Map<string, string | null>();
  const descendantCountByMemberId = new Map<string, number>();
  const generationByMemberId = new Map<string, number>();
  const trees: MentorshipTreeSummary[] = [];

  for (const member of members) {
    const isTreeFounder =
      !mentorIdByMenteeId.has(member.memberId) && menteeIdsByMentorId.has(member.memberId);
    if (!isTreeFounder) continue;
    const memberCount = walkTree(member.memberId, member.memberId, 1);
    trees.push({
      treeId: member.memberId,
      founderMemberId: member.memberId,
      memberCount,
    });
  }
  for (const member of members) {
    if (!treeIdByMemberId.has(member.memberId)) {
      treeIdByMemberId.set(member.memberId, null);
      descendantCountByMemberId.set(member.memberId, 0);
    }
  }

  /** Iterative post-order walk: trees can be deep, so no recursion. Returns the subtree size. */
  function walkTree(treeId: string, founderMemberId: string, founderGeneration: number): number {
    const visitOrder: string[] = [];
    const pending: string[] = [founderMemberId];
    generationByMemberId.set(founderMemberId, founderGeneration);
    while (pending.length > 0) {
      const memberId = pending.pop() as string;
      visitOrder.push(memberId);
      treeIdByMemberId.set(memberId, treeId);
      for (const menteeId of menteeIdsByMentorId.get(memberId) ?? []) {
        generationByMemberId.set(menteeId, (generationByMemberId.get(memberId) ?? 1) + 1);
        pending.push(menteeId);
      }
    }
    for (const memberId of visitOrder.toReversed()) {
      const descendantCount = (menteeIdsByMentorId.get(memberId) ?? []).reduce(
        (sum, menteeId) => sum + 1 + (descendantCountByMemberId.get(menteeId) ?? 0),
        0,
      );
      descendantCountByMemberId.set(memberId, descendantCount);
    }
    return visitOrder.length;
  }

  return {
    trees,
    treeIdByMemberId,
    mentorIdByMenteeId,
    menteeIdsByMentorId,
    descendantCountByMemberId,
    generationByMemberId,
  };
}
