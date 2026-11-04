import { describe, expect, it } from 'vitest';
import { validateMembers } from './memberValidation';
import { CITY_REFERENCE, rawMember } from './testFixtures';
import { buildMentorshipForest } from './treeBuilding';

const members = validateMembers(
  ['1', '2', '3', '4', '5', '6'].map((id) => rawMember(id)),
  CITY_REFERENCE,
  2026,
).members;

describe('buildMentorshipForest', () => {
  const forest = buildMentorshipForest(members, [
    { mentorMemberId: '1', menteeMemberId: '2' },
    { mentorMemberId: '1', menteeMemberId: '3' },
    { mentorMemberId: '2', menteeMemberId: '4' },
    { mentorMemberId: '5', menteeMemberId: '6' },
  ]);

  it('finds founders and sizes trees', () => {
    expect(forest.trees).toEqual([
      { treeId: '1', founderMemberId: '1', memberCount: 4 },
      { treeId: '5', founderMemberId: '5', memberCount: 2 },
    ]);
  });

  it('assigns every member to its tree', () => {
    expect(['1', '2', '3', '4', '5', '6'].map((id) => forest.treeIdByMemberId.get(id))).toEqual([
      '1',
      '1',
      '1',
      '1',
      '5',
      '5',
    ]);
  });

  it('counts all descendants, not only direct mentees', () => {
    expect(forest.descendantCountByMemberId.get('1')).toBe(3);
    expect(forest.descendantCountByMemberId.get('2')).toBe(1);
    expect(forest.descendantCountByMemberId.get('4')).toBe(0);
  });

  it('numbers generations from the founder', () => {
    expect(forest.generationByMemberId.get('1')).toBe(1);
    expect(forest.generationByMemberId.get('4')).toBe(3);
  });

  it('leaves members without mentor and mentees outside any tree', () => {
    const lonely = buildMentorshipForest(members, []);
    expect(lonely.trees).toEqual([]);
    expect(lonely.treeIdByMemberId.get('1')).toBeNull();
    expect(lonely.descendantCountByMemberId.get('1')).toBe(0);
  });

  it('handles very deep chains without recursion limits', () => {
    const depth = 20000;
    const chainMembers = validateMembers(
      Array.from({ length: depth }, (unusedValue, index) => rawMember(String(index + 1))),
      CITY_REFERENCE,
      2026,
    ).members;
    const chain = buildMentorshipForest(
      chainMembers,
      Array.from({ length: depth - 1 }, (unusedValue, index) => ({
        mentorMemberId: String(index + 1),
        menteeMemberId: String(index + 2),
      })),
    );
    expect(chain.descendantCountByMemberId.get('1')).toBe(depth - 1);
    expect(chain.generationByMemberId.get(String(depth))).toBe(depth);
  });
});
