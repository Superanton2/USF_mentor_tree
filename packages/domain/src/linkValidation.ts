import { createImportIssue, type ImportIssue } from './importIssue';
import type { Member, MentorshipLink, RawMentorshipLinkRecord } from './membershipTypes';

export interface LinkValidationResult {
  links: MentorshipLink[];
  issues: ImportIssue[];
}

interface SourcedLink extends MentorshipLink {
  sourceRow: number;
}

export function validateLinks(
  records: readonly RawMentorshipLinkRecord[],
  members: readonly Member[],
): LinkValidationResult {
  const membersById = new Map(members.map((member) => [member.memberId, member]));
  const issues: ImportIssue[] = [];

  const wellFormedLinks = dropLinksWithProblems(records, membersById, issues);
  const linksWithSingleMentor = dropMenteesWithSeveralMentors(wellFormedLinks, membersById, issues);
  const acyclicLinks = dropCycles(linksWithSingleMentor, membersById, issues);

  return {
    links: acyclicLinks.map(({ mentorMemberId, menteeMemberId }) => ({
      mentorMemberId,
      menteeMemberId,
    })),
    issues,
  };
}

function describePerson(memberId: string, membersById: Map<string, Member>): string {
  const member = membersById.get(memberId);
  return member ? `«${member.fullName}»` : `з ID ${memberId === '' ? '(порожній)' : memberId}`;
}

function dropLinksWithProblems(
  records: readonly RawMentorshipLinkRecord[],
  membersById: Map<string, Member>,
  issues: ImportIssue[],
): SourcedLink[] {
  const acceptedLinks: SourcedLink[] = [];
  const seenPairs = new Set<string>();

  for (const record of records) {
    const mentorMemberId = record.mentorMemberId.trim();
    const menteeMemberId = record.menteeMemberId.trim();
    const mentee = membersById.get(menteeMemberId);
    const rowContext = {
      sourceRow: record.sourceRow,
      memberId: menteeMemberId,
      memberName: mentee?.fullName ?? '',
    };

    const isMentorMissing = !membersById.has(mentorMemberId);
    const isMenteeMissing = mentee === undefined;
    if (isMentorMissing) {
      issues.push(
        createImportIssue({
          ...rowContext,
          code: 'MENTOR_NOT_FOUND',
          description: `Ментора ${describePerson(mentorMemberId, membersById)} не знайдено серед учасників — перевірте ID ментора. Зв'язок не додано.`,
        }),
      );
    }
    if (isMenteeMissing) {
      issues.push(
        createImportIssue({
          ...rowContext,
          code: 'MENTEE_NOT_FOUND',
          description: `Менті ${describePerson(menteeMemberId, membersById)} не знайдено серед учасників — перевірте ID менті. Зв'язок не додано.`,
        }),
      );
    }
    if (isMentorMissing || isMenteeMissing) continue;

    if (mentorMemberId === menteeMemberId) {
      issues.push(
        createImportIssue({
          ...rowContext,
          code: 'SELF_MENTORSHIP',
          description: `Учасник «${mentee.fullName}» вказаний власним ментором — зв'язок не додано.`,
        }),
      );
      continue;
    }

    const pairKey = JSON.stringify([mentorMemberId, menteeMemberId]);
    if (seenPairs.has(pairKey)) {
      issues.push(
        createImportIssue({
          ...rowContext,
          code: 'DUPLICATE_LINK',
          description: `Зв'язок ${describePerson(mentorMemberId, membersById)} → «${mentee.fullName}» повторюється — лишено один.`,
        }),
      );
      continue;
    }
    seenPairs.add(pairKey);
    acceptedLinks.push({ mentorMemberId, menteeMemberId, sourceRow: record.sourceRow });
  }
  return acceptedLinks;
}

function dropMenteesWithSeveralMentors(
  links: readonly SourcedLink[],
  membersById: Map<string, Member>,
  issues: ImportIssue[],
): SourcedLink[] {
  const linksByMentee = Map.groupBy(links, (link) => link.menteeMemberId);
  const rejectedMenteeIds = new Set<string>();

  for (const [menteeMemberId, menteeLinks] of linksByMentee) {
    if (menteeLinks.length < 2) continue;
    rejectedMenteeIds.add(menteeMemberId);
    const mentee = membersById.get(menteeMemberId);
    const mentorNames = menteeLinks.map((link) => describePerson(link.mentorMemberId, membersById));
    issues.push(
      createImportIssue({
        code: 'MULTIPLE_MENTORS',
        memberId: menteeMemberId,
        memberName: mentee?.fullName ?? '',
        sourceRow: menteeLinks[0]?.sourceRow ?? null,
        description: `У «${mentee?.fullName ?? menteeMemberId}» кілька менторів (${mentorNames.join(', ')}) — жодного зв'язку не додано. Залиште одного ментора.`,
      }),
    );
  }
  return links.filter((link) => !rejectedMenteeIds.has(link.menteeMemberId));
}

function dropCycles(
  links: readonly SourcedLink[],
  membersById: Map<string, Member>,
  issues: ImportIssue[],
): SourcedLink[] {
  const mentorByMentee = new Map(links.map((link) => [link.menteeMemberId, link.mentorMemberId]));
  const cycleMemberIds = findCycleMemberGroups(mentorByMentee);
  const rejectedMenteeIds = new Set<string>();

  for (const group of cycleMemberIds) {
    group.forEach((memberId) => rejectedMenteeIds.add(memberId));
    const names = group.map((memberId) => describePerson(memberId, membersById));
    const firstMemberId = group[0] ?? '';
    issues.push(
      createImportIssue({
        code: 'MENTORSHIP_CYCLE',
        memberId: firstMemberId,
        memberName: membersById.get(firstMemberId)?.fullName ?? '',
        sourceRow: links.find((link) => link.menteeMemberId === firstMemberId)?.sourceRow ?? null,
        description: `Менторство замкнене в коло: ${names.join(' → ')}. Усі зв'язки кола не додано — перевірте, хто чий ментор.`,
      }),
    );
  }
  return links.filter((link) => !rejectedMenteeIds.has(link.menteeMemberId));
}

/** Every member has at most one mentor, so each cycle is found by walking mentor links. */
function findCycleMemberGroups(mentorByMentee: Map<string, string>): string[][] {
  const finishedMemberIds = new Set<string>();
  const groups: string[][] = [];

  for (const startMemberId of mentorByMentee.keys()) {
    const pathPositions = new Map<string, number>();
    const path: string[] = [];
    let currentMemberId: string | undefined = startMemberId;

    while (currentMemberId !== undefined && !finishedMemberIds.has(currentMemberId)) {
      const positionInPath = pathPositions.get(currentMemberId);
      if (positionInPath !== undefined) {
        groups.push(path.slice(positionInPath));
        break;
      }
      pathPositions.set(currentMemberId, path.length);
      path.push(currentMemberId);
      currentMemberId = mentorByMentee.get(currentMemberId);
    }
    path.forEach((memberId) => finishedMemberIds.add(memberId));
  }
  return groups;
}
