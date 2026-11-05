import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { packSiblings } from 'd3-hierarchy';

const LINK_DISTANCE = 30;
const CHARGE_STRENGTH = -90;
const LAYOUT_TICKS = 300;
/** Free space kept around every tree, so neighbouring trees never touch. */
const TREE_PADDING = 36;
const RING_MARGIN = 120;
const RING_NODE_SPACING = 18;

export interface ClusterLayoutNode {
  memberId: string;
  /** null for members without a tree: they go to the outer ring. */
  treeId: string | null;
  radius: number;
}

export interface ClusterLayoutLink {
  sourceMemberId: string;
  targetMemberId: string;
}

export interface Position {
  x: number;
  y: number;
}

interface SimulatedNode extends SimulationNodeDatum {
  id: string;
  radius: number;
}

/**
 * Lays every tree out on its own, then packs the trees as circles so that different trees can
 * never overlap — however many there are. Members without a tree form a ring around the pack.
 * Everything is deterministic: d3-force uses fixed initial positions and its own seeded
 * random source, so the same data always gives the same picture, without any visible
 * "settling" on load.
 */
export function computeClusterLayout(
  nodes: readonly ClusterLayoutNode[],
  links: readonly ClusterLayoutLink[],
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const nodesByTree = Map.groupBy(
    nodes.filter((node) => node.treeId !== null),
    (node) => node.treeId as string,
  );
  const treeIdByMemberId = new Map(nodes.map((node) => [node.memberId, node.treeId]));
  const linksByTree = Map.groupBy(
    links,
    (link) => treeIdByMemberId.get(link.sourceMemberId) ?? null,
  );

  const treeLayouts = [...nodesByTree.entries()]
    .sort(([, firstNodes], [, secondNodes]) => secondNodes.length - firstNodes.length)
    .map(([treeId, treeNodes]) => layOutSingleTree(treeNodes, linksByTree.get(treeId) ?? []));

  // packSiblings writes x/y onto each circle and places the first (largest) one in the middle.
  // eslint-disable-next-line id-length -- d3-hierarchy requires the circle radius to be named `r`
  const circles = packSiblings(treeLayouts.map((layout) => ({ r: layout.radius })));
  circles.forEach((circle, position) => {
    for (const [memberId, localPosition] of treeLayouts[position]?.localPositions ?? []) {
      positions.set(memberId, { x: circle.x + localPosition.x, y: circle.y + localPosition.y });
    }
  });

  const packedRadius = Math.max(
    0,
    ...circles.map((circle) => Math.hypot(circle.x, circle.y) + circle.r),
  );
  placeUnconnectedNodesOnRing(
    nodes.filter((node) => node.treeId === null),
    packedRadius,
    positions,
  );
  return positions;
}

function layOutSingleTree(
  treeNodes: readonly ClusterLayoutNode[],
  treeLinks: readonly ClusterLayoutLink[],
): { radius: number; localPositions: Map<string, Position> } {
  const simulatedNodes: SimulatedNode[] = treeNodes.map((node) => ({
    id: node.memberId,
    radius: node.radius,
  }));
  const simulation = forceSimulation(simulatedNodes)
    .force(
      'link',
      forceLink<SimulatedNode, { source: string; target: string }>(
        treeLinks.map((link) => ({ source: link.sourceMemberId, target: link.targetMemberId })),
      )
        .id((node) => node.id)
        .distance(LINK_DISTANCE),
    )
    .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
    .force('center', forceCenter(0, 0))
    .stop();
  simulation.tick(LAYOUT_TICKS);

  const localPositions = new Map(
    simulatedNodes.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]),
  );
  const radius =
    Math.max(...simulatedNodes.map((node) => Math.hypot(node.x ?? 0, node.y ?? 0) + node.radius)) +
    TREE_PADDING / 2;
  return { radius, localPositions };
}

function placeUnconnectedNodesOnRing(
  unconnectedNodes: readonly ClusterLayoutNode[],
  packedRadius: number,
  positions: Map<string, Position>,
): void {
  const ringRadius = Math.max(
    packedRadius + RING_MARGIN,
    (unconnectedNodes.length * RING_NODE_SPACING) / (2 * Math.PI),
  );
  unconnectedNodes.forEach((node, position) => {
    const angle = (2 * Math.PI * position) / unconnectedNodes.length;
    positions.set(node.memberId, {
      x: ringRadius * Math.cos(angle),
      y: ringRadius * Math.sin(angle),
    });
  });
}
