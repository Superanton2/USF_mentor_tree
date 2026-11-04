import type { APIRequestContext } from '@playwright/test';
import type { GraphDocument, GraphMember } from '@mentor-tree/domain';

export interface DemoMembers {
  document: GraphDocument;
  memberInTree: GraphMember;
  founder: GraphMember;
  memberWithoutTree: GraphMember;
}

/** Picks people from the real demo release, so tests do not hard-code generated names. */
export async function loadDemoMembers(request: APIRequestContext): Promise<DemoMembers> {
  const document = (await (await request.get('/graph.json')).json()) as GraphDocument;
  const visible = document.members.filter((member) => !member.isHidden && member.fullName !== null);
  const founderOf = (member: GraphMember) =>
    document.members.find((candidate) => candidate.memberId === member.treeId);
  // A visible founder keeps assertions about "Засновник дерева: {name}" simple.
  const memberInTree = visible.find(
    (member) => member.mentorMemberId !== null && founderOf(member)?.isHidden === false,
  );
  const memberWithoutTree = visible.find((member) => member.treeId === null);
  const founder = memberInTree && founderOf(memberInTree);
  if (!memberInTree || !memberWithoutTree || !founder)
    throw new Error('Demo data lacks the members the tests need');
  return { document, memberInTree, founder, memberWithoutTree };
}
