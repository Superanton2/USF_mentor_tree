import { describe, expect, it } from 'vitest';
import { buildConnectorPath } from './connectorPath';
import { splitNameIntoTwoLines } from './nameLines';
import {
  GENERATION_SPACING,
  LABEL_HEIGHT,
  computeLineageLayout,
  type LineageInputNode,
  type LineageLayout,
} from './treeLayout';

const measureByLength = (text: string) => text.length * 7.5;

function node(
  memberId: string,
  children: LineageInputNode[] = [],
  name = `Ім'я${memberId} Прізвище${memberId}`,
): LineageInputNode {
  const { firstLine, secondLine } = splitNameIntoTwoLines(name);
  return { memberId, firstLine, secondLine, children };
}

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildRandomTree(size: number, seed: number): LineageInputNode {
  const random = createRandom(seed);
  const nodes = [node('0', [], 'Корінь Дерева')];
  for (let index = 1; index < size; index++) {
    const parent = nodes[Math.floor(random() * nodes.length)] as LineageInputNode;
    const nameLength = 3 + Math.floor(random() * 18);
    const child = node(
      String(index),
      [],
      `${'А'.repeat(nameLength)} ${'Б'.repeat(2 + Math.floor(random() * 16))}`,
    );
    parent.children.push(child);
    nodes.push(child);
  }
  return nodes[0] as LineageInputNode;
}

/** The property the owner cares about: no two labels may ever overlap. */
function findOverlaps(layout: LineageLayout): string[] {
  const problems: string[] = [];
  const { nodes } = layout;
  for (let first = 0; first < nodes.length; first++) {
    for (let second = first + 1; second < nodes.length; second++) {
      const firstNode = nodes[first];
      const secondNode = nodes[second];
      if (!firstNode || !secondNode) continue;
      const horizontalGap =
        Math.abs(firstNode.x - secondNode.x) - (firstNode.width + secondNode.width) / 2;
      const verticalGap = Math.abs(firstNode.y - secondNode.y) - LABEL_HEIGHT;
      if (horizontalGap < 0 && verticalGap < 0)
        problems.push(`${firstNode.memberId} overlaps ${secondNode.memberId}`);
    }
  }
  return problems;
}

describe('computeLineageLayout', () => {
  it('puts generations on separate rows and centers a parent above its children', () => {
    const layout = computeLineageLayout(node('1', [node('2'), node('3')]), measureByLength);
    const byId = new Map(layout.nodes.map((layoutNode) => [layoutNode.memberId, layoutNode]));
    expect(byId.get('1')?.y).toBe(0);
    expect(byId.get('2')?.y).toBe(GENERATION_SPACING);
    expect(byId.get('1')?.x).toBeCloseTo(((byId.get('2')?.x ?? 0) + (byId.get('3')?.x ?? 0)) / 2);
    expect(byId.get('2')?.parentMemberId).toBe('1');
  });

  it('lays out a single member', () => {
    const layout = computeLineageLayout(node('1'), measureByLength);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.bounds.minY).toBeLessThan(layout.bounds.maxY);
  });

  it('never overlaps labels, even for wide and deep random trees', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(
        findOverlaps(computeLineageLayout(buildRandomTree(60 + seed * 5, seed), measureByLength)),
      ).toEqual([]);
    }
  });

  it('never overlaps labels in a star of 40 mentees and in a 30-generation chain', () => {
    const star = node(
      '0',
      Array.from({ length: 40 }, (unusedValue, index) => node(String(index + 1))),
    );
    expect(findOverlaps(computeLineageLayout(star, measureByLength))).toEqual([]);

    let chain = node('30');
    for (let depth = 29; depth >= 0; depth--) chain = node(String(depth), [chain]);
    expect(findOverlaps(computeLineageLayout(chain, measureByLength))).toEqual([]);
  });

  it('reserves at least the measured text width plus padding', () => {
    const layout = computeLineageLayout(node('1', [], 'Дуже-Довге-Ім’я Прізвище'), measureByLength);
    expect(layout.nodes[0]?.width).toBeGreaterThanOrEqual(measureByLength('Дуже-Довге-Ім’я'));
  });
});

describe('splitNameIntoTwoLines', () => {
  it('splits off the surname', () => {
    expect(splitNameIntoTwoLines('Томас-Георг Арктойський')).toEqual({
      firstLine: 'Томас-Георг',
      secondLine: 'Арктойський',
    });
    expect(splitNameIntoTwoLines('Анна Марія Коваль')).toEqual({
      firstLine: 'Анна Марія',
      secondLine: 'Коваль',
    });
    expect(splitNameIntoTwoLines('  Мононім ')).toEqual({ firstLine: 'Мононім', secondLine: '' });
  });
});

describe('buildConnectorPath', () => {
  it('goes straight down under the parent', () => {
    expect(buildConnectorPath(10, 0, 10)).toMatch(/^M 10 \d+ V \d+$/);
  });
  it('uses a bus with rounded corners towards either side', () => {
    expect(buildConnectorPath(0, 0, 100)).toContain('Q');
    expect(buildConnectorPath(0, 0, -100)).toContain('H -');
  });
  it('keeps corners smaller than half of a short distance', () => {
    expect(buildConnectorPath(0, 0, 6)).toContain('Q 0');
  });
});
