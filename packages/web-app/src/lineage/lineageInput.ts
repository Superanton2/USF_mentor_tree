import { listMentees, type GraphIndex } from '@mentor-tree/domain';
import type { Translations } from '../locales';
import { splitNameIntoTwoLines } from './nameLines';
import type { LineageInputNode } from './treeLayout';

/** Turns one mentorship tree from the index into the input of the layout. */
export function buildLineageInput(
  index: GraphIndex,
  founderMemberId: string,
  translations: Translations,
): LineageInputNode | null {
  const founder = index.membersById.get(founderMemberId);
  if (!founder) return null;
  const toNode = (memberId: string, name: string | null): LineageInputNode => {
    const { firstLine, secondLine } = splitNameIntoTwoLines(name ?? translations.hiddenMemberName);
    return {
      memberId,
      firstLine,
      secondLine,
      children: listMentees(index, memberId).map((mentee) =>
        toNode(mentee.memberId, mentee.fullName),
      ),
    };
  };
  return toNode(founder.memberId, founder.fullName);
}
