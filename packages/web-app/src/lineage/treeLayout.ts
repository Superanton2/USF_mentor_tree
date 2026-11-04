import { hierarchy, tree } from 'd3-hierarchy';

export const LINEAGE_FONT_SIZE = 13;
export const LINEAGE_LINE_HEIGHT = 16;
/** Room for the colored dot and breathing space on both sides of a name. */
export const LABEL_HORIZONTAL_PADDING = 40;
export const MIN_LABEL_WIDTH = 56;
export const LABEL_HEIGHT = 2 * LINEAGE_LINE_HEIGHT;
/** Distance between generations; the gap beyond LABEL_HEIGHT holds the connector lines. */
export const GENERATION_SPACING = 96;

export interface LineageInputNode {
  memberId: string;
  firstLine: string;
  secondLine: string;
  children: LineageInputNode[];
}

export interface LineageLayoutNode {
  memberId: string;
  firstLine: string;
  secondLine: string;
  /** Center of the label. */
  x: number;
  y: number;
  width: number;
  parentMemberId: string | null;
  depth: number;
}

export interface LineageLayout {
  nodes: LineageLayoutNode[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export type TextWidthMeasurer = (text: string) => number;

/**
 * Top-down tree layout where each label gets the horizontal room its text needs, so labels on
 * one generation can never overlap (checked by tests). Reingold–Tilford via d3.tree(): the
 * separation callback states how far apart two neighbours must be, in the same units as x.
 */
export function computeLineageLayout(
  root: LineageInputNode,
  measureTextWidth: TextWidthMeasurer,
): LineageLayout {
  const widthOf = (node: LineageInputNode) =>
    Math.max(MIN_LABEL_WIDTH, measureTextWidth(node.firstLine), measureTextWidth(node.secondLine)) +
    LABEL_HORIZONTAL_PADDING;

  const layoutRoot = tree<LineageInputNode>()
    .nodeSize([1, GENERATION_SPACING])
    .separation((first, second) => (widthOf(first.data) + widthOf(second.data)) / 2)(
    hierarchy(root, (node) => node.children),
  );

  const nodes: LineageLayoutNode[] = layoutRoot.descendants().map((node) => ({
    memberId: node.data.memberId,
    firstLine: node.data.firstLine,
    secondLine: node.data.secondLine,
    x: node.x,
    y: node.y,
    width: widthOf(node.data),
    parentMemberId: node.parent?.data.memberId ?? null,
    depth: node.depth,
  }));

  return {
    nodes,
    bounds: {
      minX: Math.min(...nodes.map((node) => node.x - node.width / 2)),
      maxX: Math.max(...nodes.map((node) => node.x + node.width / 2)),
      minY: -LABEL_HEIGHT / 2,
      maxY: Math.max(...nodes.map((node) => node.y)) + LABEL_HEIGHT / 2,
    },
  };
}
