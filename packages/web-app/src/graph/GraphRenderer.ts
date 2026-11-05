import type { GraphSettings } from '@mentor-tree/domain';

export interface GraphRendererNode {
  memberId: string;
  treeId: string | null;
  /** null for hidden members: their names are never drawn. */
  label: string | null;
  descendantCount: number;
}

export interface GraphRendererLink {
  mentorMemberId: string;
  menteeMemberId: string;
}

/** Pixels covered by interface on each side; the camera frames the tree in the free area. */
export interface ViewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface GraphRendererSelection {
  memberId: string | null;
  treeId: string | null;
}

export interface GraphRendererCallbacks {
  onMemberClick(memberId: string): void;
  onBackgroundClick(): void;
}

export interface GraphRendererOptions {
  settings: GraphSettings;
  shouldScaleNodesByDescendants: boolean;
}

/**
 * The only door to the graph library (SPEC 6.4). React components talk to this interface, so
 * force-graph can be replaced (e.g. by Sigma.js) without touching them.
 */
export interface GraphRenderer {
  setSelection(selection: GraphRendererSelection): void;
  /** Smoothly frames the tree; with null frames the whole graph. */
  focusOnTree(treeId: string | null, insets: ViewInsets): void;
  /** Screen position of a member, or null if it is not drawn. Used by tests and overlays. */
  getMemberScreenPosition(memberId: string): { x: number; y: number } | null;
  destroy(): void;
}

export type GraphRendererFactory = (
  container: HTMLElement,
  nodes: GraphRendererNode[],
  links: GraphRendererLink[],
  options: GraphRendererOptions,
  callbacks: GraphRendererCallbacks,
) => GraphRenderer;
