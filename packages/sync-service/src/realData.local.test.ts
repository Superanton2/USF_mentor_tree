import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importMembership } from '@mentor-tree/domain';
import { CsvMembershipDataSource } from './csvMembershipDataSource';

// Local-only acceptance test (SPEC 12.2, stage 1): real data never reaches CI,
// so this file skips itself when data/private is absent.
const projectRoot = resolve(import.meta.dirname, '../../..');
const privateDirectory = join(projectRoot, 'data/private');
const hasRealData = existsSync(join(privateDirectory, 'mentorship_clean.csv'));

describe.skipIf(!hasRealData)('real data (stage 1 acceptance figures)', () => {
  it('matches the numbers agreed with the owner', async () => {
    const raw = await new CsvMembershipDataSource({
      directory: privateDirectory,
      citiesFilePath: join(projectRoot, 'data/reference/cities.csv'),
    }).readMembershipRecords();
    const result = importMembership(raw, { currentYear: 2026, publishedAt: 'test' });

    const generations = [...result.forest.generationByMemberId.values()];
    const largestTree = [...result.forest.trees].sort(
      (first, second) => second.memberCount - first.memberCount,
    )[0];
    const membersInTrees = result.members.filter(
      (member) => result.forest.treeIdByMemberId.get(member.memberId) !== null,
    );
    const issueCounts = Object.fromEntries(
      Array.from(
        Map.groupBy(result.issues, (issue) => issue.code),
        ([code, issues]) => [code, issues.length],
      ),
    );

    expect({
      members: result.members.length,
      links: result.links.length,
      trees: result.forest.trees.length,
      inTrees: membersInTrees.length,
      withoutTree: result.members.length - membersInTrees.length,
      maxGeneration: Math.max(...generations),
      largestTreeSize: largestTree?.memberCount,
      largestTreeFounder: result.members.find(
        (member) => member.memberId === largestTree?.founderMemberId,
      )?.fullName,
      issueTotal: result.issues.length,
      issueCounts,
    }).toEqual({
      members: 1051,
      links: 438,
      trees: 104,
      inTrees: 542,
      withoutTree: 509,
      maxGeneration: 6,
      largestTreeSize: 21,
      largestTreeFounder: 'Аділь Абдураманов',
      issueTotal: 41,
      issueCounts: { EXTERNAL_MENTOR_RECORD: 9, UNRESOLVED_MENTOR: 32 },
    });
  });
});
