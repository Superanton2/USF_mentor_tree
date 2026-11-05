import { describe, expect, it } from 'vitest';
import {
  computeClusterLayout,
  type ClusterLayoutLink,
  type ClusterLayoutNode,
} from './clusterLayout';

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** A forest of random trees (2..40 members each) plus some members without a tree. */
function buildForest(treeCount: number, unconnectedCount: number, seed: number) {
  const random = createRandom(seed);
  const nodes: ClusterLayoutNode[] = [];
  const links: ClusterLayoutLink[] = [];
  for (let tree = 0; tree < treeCount; tree++) {
    const size = 2 + Math.floor(random() * 39);
    const memberIds: string[] = [];
    for (let member = 0; member < size; member++) {
      const memberId = `t${tree}-m${member}`;
      nodes.push({ memberId, treeId: `t${tree}`, radius: 3 + Math.floor(random() * 10) });
      const mentorId = memberIds[Math.floor(random() * memberIds.length)];
      if (mentorId !== undefined)
        links.push({ sourceMemberId: memberId, targetMemberId: mentorId });
      memberIds.push(memberId);
    }
  }
  for (let loner = 0; loner < unconnectedCount; loner++) {
    nodes.push({ memberId: `loner-${loner}`, treeId: null, radius: 3 });
  }
  return { nodes, links };
}

function findClosestGapBetweenTrees(
  nodes: readonly ClusterLayoutNode[],
  positions: Map<string, { x: number; y: number }>,
): number {
  let closestGap = Number.POSITIVE_INFINITY;
  for (const [firstIndex, first] of nodes.entries()) {
    for (const second of nodes.slice(firstIndex + 1)) {
      if (first.treeId === second.treeId) continue;
      const firstPosition = positions.get(first.memberId);
      const secondPosition = positions.get(second.memberId);
      if (!firstPosition || !secondPosition) continue;
      const distance = Math.hypot(
        firstPosition.x - secondPosition.x,
        firstPosition.y - secondPosition.y,
      );
      closestGap = Math.min(closestGap, distance - first.radius - second.radius);
    }
  }
  return closestGap;
}

describe('computeClusterLayout', () => {
  it('places every node exactly once', () => {
    const { nodes, links } = buildForest(20, 15, 1);
    const positions = computeClusterLayout(nodes, links);
    expect(positions.size).toBe(nodes.length);
    for (const position of positions.values()) {
      expect(Number.isFinite(position.x) && Number.isFinite(position.y)).toBe(true);
    }
  });

  it('is deterministic', () => {
    const { nodes, links } = buildForest(30, 10, 2);
    expect([...computeClusterLayout(nodes, links)]).toEqual([
      ...computeClusterLayout(nodes, links),
    ]);
  });

  it('keeps different trees apart: no node of one tree touches a node of another', () => {
    for (const seed of [1, 2, 3]) {
      const { nodes, links } = buildForest(104, 0, seed);
      expect(findClosestGapBetweenTrees(nodes, computeClusterLayout(nodes, links))).toBeGreaterThan(
        0,
      );
    }
  });

  it('puts members without a tree on a ring outside every tree', () => {
    const { nodes, links } = buildForest(10, 40, 4);
    const positions = computeClusterLayout(nodes, links);
    const treeExtent = Math.max(
      ...nodes
        .filter((node) => node.treeId !== null)
        .map((node) => {
          const position = positions.get(node.memberId);
          return Math.hypot(position?.x ?? 0, position?.y ?? 0);
        }),
    );
    for (const node of nodes.filter((candidate) => candidate.treeId === null)) {
      const position = positions.get(node.memberId);
      expect(Math.hypot(position?.x ?? 0, position?.y ?? 0)).toBeGreaterThan(treeExtent);
    }
  });

  it('handles an empty graph and a graph with only unconnected members', () => {
    expect(computeClusterLayout([], []).size).toBe(0);
    expect(computeClusterLayout([{ memberId: 'a1', treeId: null, radius: 3 }], []).size).toBe(1);
  });
});
