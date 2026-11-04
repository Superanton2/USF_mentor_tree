import { describe, expect, it } from 'vitest';
import type { GraphDocument, GraphMember } from './graphDocument';
import {
  buildGraphIndex,
  findTreeFounder,
  listMentees,
  listPathFromFounder,
  listTreeMembers,
  searchMembers,
} from './graphIndex';

function member(memberId: string, overrides: Partial<GraphMember> = {}): GraphMember {
  return {
    memberId,
    fullName: `Person ${memberId}`,
    cityKey: null,
    membershipLevel: null,
    leadershipProgramYear: null,
    mentorMemberId: null,
    treeId: null,
    descendantCount: 0,
    isHidden: false,
    ...overrides,
  };
}

const document: GraphDocument = {
  schemaVersion: 1,
  publishedAt: 'x',
  members: [
    member('1', { fullName: 'Микита Храмов', treeId: '1', descendantCount: 2 }),
    member('2', { fullName: 'Миколай Храмовський', treeId: '1', mentorMemberId: '1' }),
    member('hidden-1', { fullName: null, isHidden: true, treeId: '1', mentorMemberId: '1' }),
    member('4', { fullName: 'Микита Інший' }),
  ],
  trees: [{ treeId: '1', founderMemberId: '1', memberCount: 3 }],
  cities: [],
  settings: {} as GraphDocument['settings'],
};
const index = buildGraphIndex(document);
const names = (query: string, limit?: number) =>
  searchMembers(index, query, limit).map((found) => found.memberId);

describe('graph index', () => {
  it('searches by prefix in any word order and never finds hidden members', () => {
    expect(names('храмов мик')).toEqual(['1', '2']);
    expect(names('hidden')).toEqual([]);
    expect(names('')).toEqual([]);
  });

  it('ranks whole words first and respects the limit', () => {
    expect(names('микита')).toEqual(['4', '1']);
    expect(names('ми', 1)).toHaveLength(1);
  });

  it('finds founders, tree members and mentees', () => {
    expect(findTreeFounder(index, '1')?.memberId).toBe('1');
    expect(findTreeFounder(index, 'nope')).toBeNull();
    expect(listTreeMembers(index, '1')).toHaveLength(3);
    expect(listMentees(index, '1').map((found) => found.memberId)).toEqual(['2', 'hidden-1']);
    expect(listMentees(index, '4')).toEqual([]);
  });

  it('lists the path from the founder down to a member', () => {
    expect(listPathFromFounder(index, 'hidden-1').map((found) => found.memberId)).toEqual([
      '1',
      'hidden-1',
    ]);
    expect(listPathFromFounder(index, '1').map((found) => found.memberId)).toEqual(['1']);
    expect(listPathFromFounder(index, 'nope')).toEqual([]);
  });
});
