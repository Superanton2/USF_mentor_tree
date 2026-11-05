import type { GraphSettings } from '@mentor-tree/domain';
import type { LabelMode } from '../settings/userSettings';

export interface GraphRendererNode {
  memberId: string;
  treeId: string | null;
  /** null for hidden members: their names are never drawn. */
  label: string | null;
  descendantCount: number;
}

/** How one member is drawn; `fillColor: null` means "no data": an empty ring. */
export interface MemberStyle {
  fillColor: string | null;
  matchesFilters: boolean;
}

/** Everything the visitor can change in the settings panel that affects the picture. */
export interface GraphAppearance {
  memberStyles: Map<string, MemberStyle>;
  /** In the uniform color mode the chosen tree turns highlight yellow; in other modes nodes keep their mode color. */
  isSelectedTreeHighlighted: boolean;
  labelMode: LabelMode;
  shouldScaleNodes: boolean;
}

/** What a member currently looks like. Exposed for tests and overlays. */
export interface MemberRendering {
  fillColor: string | null;
  isDimmed: boolean;
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
}

/**
 * The only door to the graph library (SPEC 6.4). React components talk to this interface, so
 * force-graph can be replaced (e.g. by Sigma.js) without touching them.
 */
export interface GraphRenderer {
  setSelection(selection: GraphRendererSelection): void;
  setAppearance(appearance: GraphAppearance): void;
  getMemberRendering(memberId: string): MemberRendering | null;
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
